import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'bodyshop_todo_notif_map_v1';
const CHANNEL_ID = 'todo-reminders';

export async function ensureTodoNotificationChannel() {
    if (Platform.OS !== 'android') return;
    try {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: 'To-Do Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
        });
    } catch (e) {}
}

async function getMap() {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}
async function setMap(map) {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
}

// Cancels every local notification scheduled for a to-do (exact-time + hourly repeat, if any).
export async function cancelTodoReminder(todoId) {
    const map = await getMap();
    const ids = map[todoId];
    if (ids && ids.length) {
        for (const id of ids) {
            try { await Notifications.cancelScheduledNotificationAsync(id); } catch (e) {}
        }
    }
    if (map[todoId]) {
        delete map[todoId];
        await setMap(map);
    }
}

// Schedules a reminder for `todo.nextReminderAt`. High-priority to-dos additionally get a
// natively-repeating hourly nag (via a TIME_INTERVAL trigger) so they keep nagging even if the
// app is never reopened — this is what "every hour, one by one" means in practice.
export async function scheduleTodoReminder(todo) {
    await cancelTodoReminder(todo._id);
    if (!todo || todo.completed) return;
    const fireDate = new Date(todo.nextReminderAt);
    if (isNaN(fireDate.getTime())) return;

    const scheduledIds = [];
    try {
        const exactId = await Notifications.scheduleNotificationAsync({
            content: {
                title: todo.priority === 'High' ? '⚠️ High Priority To-Do' : '📋 To-Do Reminder',
                body: todo.text,
                data: { todoId: todo._id },
                sound: 'default',
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate, channelId: CHANNEL_ID },
        });
        scheduledIds.push(exactId);

        if (todo.priority === 'High') {
            const hourlyId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '⚠️ High Priority To-Do',
                    body: todo.text,
                    data: { todoId: todo._id },
                    sound: 'default',
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3600, repeats: true, channelId: CHANNEL_ID },
            });
            scheduledIds.push(hourlyId);
        }

        const map = await getMap();
        map[todo._id] = scheduledIds;
        await setMap(map);
    } catch (e) {
        console.log('scheduleTodoReminder error', e);
    }
}
