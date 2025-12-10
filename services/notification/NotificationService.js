// Notification Service for Push Notifications and Real-time SSE
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { API_CONFIG } from "../../config/apiConfig";
import { STORAGE_KEYS } from "../../utils/constants";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  /**
   * Get notifications from database
   */
  async getNotificationsFromDB(params = {}) {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      console.log(
        "NotificationService.getNotificationsFromDB - Token exists:",
        !!token
      );
      console.log(
        "NotificationService.getNotificationsFromDB - User data:",
        userData
      );

      if (!token) {
        console.error("No authentication token found in AsyncStorage");
        throw new Error("No authentication token");
      }

      const queryParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 20,
        unreadOnly: params.unreadOnly || false,
      });

      const response = await fetch(
        `${API_CONFIG.baseURL}/notifications/history?${queryParams}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      console.log(
        "NotificationService.getNotificationsFromDB - API response:",
        result
      );

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || "Failed to fetch notifications");
      }
    } catch (error) {
      console.error("Get notifications from DB error:", error);
      throw error;
    }
  }

  /**
   * Get unread count from database
   */
  async getUnreadCount() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      console.log(
        "NotificationService.getUnreadCount - Token exists:",
        !!token
      );
      console.log("NotificationService.getUnreadCount - User data:", userData);

      if (!token) {
        console.error("No authentication token found in AsyncStorage");
        throw new Error("No authentication token");
      }

      const response = await fetch(
        `${API_CONFIG.baseURL}/notifications/unread-count`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      console.log("NotificationService.getUnreadCount - API response:", result);

      if (result.success) {
        return result.data.count;
      } else {
        throw new Error(result.message || "Failed to get unread count");
      }
    } catch (error) {
      console.error("Get unread count error:", error);
      return 0;
    }
  }

  /**
   * Mark notification as read in database
   */
  async markAsReadInDB(notificationId) {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(
        `${API_CONFIG.baseURL}/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to mark as read");
      }
      return result;
    } catch (error) {
      console.error("Mark as read in DB error:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read in database
   */
  async markAllAsReadInDB() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(
        `${API_CONFIG.baseURL}/notifications/mark-all-read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to mark all as read");
      }
      return result;
    } catch (error) {
      console.error("Mark all as read in DB error:", error);
      throw error;
    }
  }

  /**
   * Create notification in database
   */
  async createNotificationInDB(notificationData) {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(
        `${API_CONFIG.baseURL}/notifications/create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(notificationData),
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to create notification");
      }
      return result.data;
    } catch (error) {
      console.error("Create notification in DB error:", error);
      throw error;
    }
  }

  /**
   * Connect to SSE notification stream
   */
  async connectToStream() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        console.warn("No auth token, cannot connect to notification stream");
        return;
      }

      const streamUrl = `${API_CONFIG.baseURL}/notifications/stream`;

      // Note: EventSource in React Native may require polyfill
      // Using fetch with streaming as fallback
      this.startStreamingConnection(streamUrl, token);
    } catch (error) {
      console.error("Error connecting to notification stream:", error);
    }
  }

  /**
   * Start streaming connection using fetch
   */
  async startStreamingConnection(url, token) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            this.processStreamData(text);
          }
        } catch (error) {
          console.error("Stream reading error:", error);
          this.handleReconnect();
        }
      };

      readStream();
      this.reconnectAttempts = 0; // Reset on successful connection
    } catch (error) {
      console.error("Stream connection error:", error);
      this.handleReconnect();
    }
  }

  /**
   * Process incoming stream data
   */
  processStreamData(text) {
    const lines = text.split("\n");
    let eventType = "message";
    let eventData = null;

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        try {
          eventData = JSON.parse(line.slice(5).trim());
        } catch (e) {
          eventData = line.slice(5).trim();
        }
      }
    }

    if (eventData) {
      this.handleEvent(eventType, eventData);
    }
  }

  /**
   * Handle incoming event
   */
  handleEvent(eventType, data) {
    // Trigger registered listeners
    const eventListeners = this.listeners.get(eventType) || [];
    eventListeners.forEach((callback) => callback(data));

    // Also trigger 'all' listeners
    const allListeners = this.listeners.get("all") || [];
    allListeners.forEach((callback) => callback({ type: eventType, data }));

    // Show local notification for important events
    this.handleNotificationEvent(eventType, data);
  }

  /**
   * Handle notification events and show local notifications
   */
  handleNotificationEvent(eventType, data) {
    switch (eventType) {
      case "TRIP_ASSIGNED":
        this.notifyTripAssignment(data.data || data);
        break;
      case "TRIP_STARTED":
        this.notifyTripStarted(
          data.data || data,
          data.data?.driverName || "Driver"
        );
        break;
      case "TRIP_ENDED":
        this.notifyTripCompleted(
          data.data || data,
          data.data?.driverName || "Driver"
        );
        break;
      case "BREAKDOWN_REPORTED":
        this.notifyBreakdown(data.data || data);
        break;
      case "TRIP_CANCELLED":
        this.notifyTripCancelled(data.data || data);
        break;
      case "TRIP_EXPIRED":
        this.notifyTripExpired(data.data || data);
        break;
    }
  }

  /**
   * Handle reconnection
   */
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(
        () => this.connectToStream(),
        this.reconnectDelay * this.reconnectAttempts
      );
    } else {
      console.error("Max reconnect attempts reached");
    }
  }

  /**
   * Simple SSE connection with callback
   * Returns a cleanup function
   */
  async connectSSE(onNotification) {
    try {
      // Register callback for all events
      if (onNotification) {
        this.on("all", (event) => {
          onNotification({
            type: event.type,
            message: event.data?.message || event.data,
            data: event.data,
          });
        });
      }

      // Start the stream connection
      await this.connectToStream();

      // Return cleanup function
      return () => {
        this.disconnect();
        this.listeners.delete("all");
      };
    } catch (error) {
      console.error("Error in connectSSE:", error);
      return () => {}; // Return no-op cleanup
    }
  }

  /**
   * Disconnect from stream
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Add event listener
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * Remove event listener
   */
  off(eventType, callback) {
    const eventListeners = this.listeners.get(eventType) || [];
    const index = eventListeners.indexOf(callback);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Notification permission not granted");
        return false;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        await AsyncStorage.setItem("pushToken", token);
        return token;
      }

      return true;
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  }

  /**
   * Get Expo push token
   */
  async getPushToken() {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#D4AF37",
        });
      }

      // Get projectId from various sources
      let projectId = null;

      // Try to get from expo config extra (env variable)
      if (Constants?.expoConfig?.extra?.easProjectId) {
        projectId = Constants.expoConfig.extra.easProjectId;
      }
      // Try from easConfig
      else if (Constants?.easConfig?.projectId) {
        projectId = Constants.easConfig.projectId;
      }

      // Validate UUID format (must be valid UUID for Expo)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!projectId || !uuidRegex.test(projectId)) {
        console.warn(
          "Expo projectId is missing or invalid. Push notifications will not work. Set EXPO_PUBLIC_EAS_PROJECT_ID in .env with a valid UUID from your EAS project."
        );
        // Return null instead of throwing - app can still work without push notifications
        return null;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return token;
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  }

  /**
   * Schedule local notification (for testing without backend)
   */
  async scheduleLocalNotification(title, body, data = {}) {
    try {
      // Store notification if it has targetRole or is a general notification
      if (data.targetRole || !data.type) {
        await this.storeNotification({ title, body, data });
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  }

  /**
   * Show trip assignment notification
   */
  async notifyTripAssignment(tripData) {
    const notification = {
      title: "🚛 New Trip Assigned!",
      body: `Trip from ${tripData.startLocation?.name || "Start"} to ${tripData.endLocation?.name || "End"}. Distance: ${tripData.distance || "N/A"} km`,
      data: {
        type: "TRIP_ASSIGNED",
        tripId: tripData._id,
        targetRole: "driver",
        screen: "/(driver)/trip/[id]",
      },
    };

    // Store the notification
    await this.storeNotification(notification);

    // Show local notification
    await this.scheduleLocalNotification(
      notification.title,
      notification.body,
      notification.data
    );
  }

  /**
   * Show trip started notification (to admin)
   */
  async notifyTripStarted(tripData, driverName) {
    await this.scheduleLocalNotification(
      "🚀 Trip Started",
      `${driverName} started trip to ${tripData.endLocation?.name || "destination"}`,
      {
        type: "TRIP_STARTED",
        tripId: tripData._id,
        screen: "/(admin)/tracking/live",
      }
    );
  }

  /**
   * Show trip completed notification
   */
  async notifyTripCompleted(tripData, driverName) {
    await this.scheduleLocalNotification(
      "✅ Trip Completed",
      `${driverName} completed trip. Distance: ${tripData.actualDistance || "N/A"} km`,
      {
        type: "TRIP_COMPLETED",
        tripId: tripData._id,
      }
    );
  }

  /**
   * Show breakdown notification (to admin)
   */
  async notifyBreakdown(breakdownData) {
    const notification = {
      title: "⚠️ Breakdown Reported",
      body: `${breakdownData.driverName || "Driver"} reported a ${breakdownData.breakdownType} breakdown on truck ${breakdownData.truckNumber}`,
      data: {
        type: "BREAKDOWN_REPORTED",
        breakdownId: breakdownData.breakdownId,
        driverName: breakdownData.driverName,
        truckNumber: breakdownData.truckNumber,
        breakdownType: breakdownData.breakdownType,
        severity: breakdownData.severity,
        targetRole: "admin",
        screen: "/(admin)/tracking/live",
      },
    };

    // Store the notification locally
    await this.storeNotification(notification);

    // Show local notification
    await this.scheduleLocalNotification(
      notification.title,
      notification.body,
      notification.data
    );
  }

  /**
   * Show trip status change notification (to admin)
   */
  async notifyTripStatusChange(statusData) {
    const notification = {
      title: `🚛 Trip ${statusData.status}`,
      body: `${statusData.driverName || "Driver"} has ${statusData.status.toLowerCase()} their trip at ${new Date().toLocaleTimeString()}`,
      data: {
        type: "TRIP_STATUS_CHANGE",
        tripId: statusData.tripId,
        driverName: statusData.driverName,
        truckNumber: statusData.truckNumber,
        status: statusData.status,
        targetRole: "admin",
        screen: "/(admin)/tracking/live",
      },
    };

    // Store the notification locally
    await this.storeNotification(notification);

    // Show local notification
    await this.scheduleLocalNotification(
      notification.title,
      notification.body,
      notification.data
    );
  }

  /**
   * Show trip cancelled notification
   */
  async notifyTripCancelled(tripData) {
    await this.scheduleLocalNotification(
      "❌ Trip Cancelled",
      tripData.reason || "Your trip has been cancelled",
      {
        type: "TRIP_CANCELLED",
        tripId: tripData.tripId,
      }
    );
  }

  /**
   * Show trip expired notification
   */
  async notifyTripExpired(tripData) {
    await this.scheduleLocalNotification(
      "⏰ Trip Expired",
      tripData.message || "A trip has expired",
      {
        type: "TRIP_EXPIRED",
        tripId: tripData.tripId,
      }
    );
  }

  /**
   * Show shift activated notification (to admin)
   */
  async notifyShiftActivated(driverName, truckNumber) {
    await this.scheduleLocalNotification(
      "⚡ Shift Activated",
      `${driverName} activated shift with truck ${truckNumber}`,
      {
        type: "SHIFT_ACTIVATED",
        screen: "/(admin)/fleet/shift-assignments",
      }
    );
  }

  /**
   * Add notification listener
   */
  addNotificationListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    // Only available on native platforms (iOS/Android), not web
    if (Platform.OS !== "web" && Notifications.removeAllNotificationListeners) {
      Notifications.removeAllNotificationListeners();
    }
  }

  /**
   * Get all notifications
   */
  async getAllNotifications() {
    try {
      const notifications =
        await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }

  /**
   * Get badge count
   */
  async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error("Error getting badge count:", error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error("Error setting badge count:", error);
    }
  }

  /**
   * Notify about breakdown reported
   */
  async notifyBreakdownReported(breakdown, driver) {
    try {
      const notificationData = {
        title: "Breakdown Reported",
        body: `${driver.name} reported a breakdown: ${breakdown.breakdownType}`,
        data: {
          type: "breakdown_reported",
          breakdownId: breakdown._id,
          driverId: driver._id,
          tripId: breakdown.trip,
          location: breakdown.location?.address || "Unknown location",
        },
      };

      // Send push notification to all admins
      await this.sendNotification(notificationData);

      console.log("Breakdown notification sent:", notificationData);
    } catch (error) {
      console.error("Error sending breakdown notification:", error);
    }
  }

  /**
   * Send notification (base method)
   */
  async sendNotification(notificationData) {
    try {
      // For now, use local notification as fallback
      // In production, this would send to backend for proper role-based targeting
      await this.scheduleLocalNotification(
        notificationData.title,
        notificationData.body,
        notificationData.data
      );
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  /**
   * Store notification for user
   */
  async storeNotification(notification) {
    try {
      const stored =
        (await AsyncStorage.getItem("stored_notifications")) || "[]";
      const notifications = JSON.parse(stored);

      const newNotification = {
        id: Date.now().toString(),
        ...notification,
        timestamp: new Date().toISOString(),
        read: false,
      };

      notifications.unshift(newNotification);

      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(50);
      }

      await AsyncStorage.setItem(
        "stored_notifications",
        JSON.stringify(notifications)
      );
      return newNotification;
    } catch (error) {
      console.error("Error storing notification:", error);
      return null;
    }
  }

  /**
   * Get stored notifications
   */
  async getStoredNotifications() {
    try {
      const stored =
        (await AsyncStorage.getItem("stored_notifications")) || "[]";
      return JSON.parse(stored);
    } catch (error) {
      console.error("Error getting stored notifications:", error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const stored =
        (await AsyncStorage.getItem("stored_notifications")) || "[]";
      const notifications = JSON.parse(stored);

      const notification = notifications.find((n) => n.id === notificationId);
      if (notification) {
        notification.read = true;
        await AsyncStorage.setItem(
          "stored_notifications",
          JSON.stringify(notifications)
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(notificationId) {
    try {
      const stored =
        (await AsyncStorage.getItem("stored_notifications")) || "[]";
      const notifications = JSON.parse(stored);

      const filteredNotifications = notifications.filter(
        (n) => n.id !== notificationId
      );
      await AsyncStorage.setItem(
        "stored_notifications",
        JSON.stringify(filteredNotifications)
      );
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  }
}

export default new NotificationService();
