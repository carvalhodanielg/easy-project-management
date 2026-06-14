import { createContext } from 'react';

/**
 * Id of the sprint a task is currently being moved *into* (after a drag-drop,
 * while the API call is in flight), or null. Drives the per-sprint "movendo…"
 * indicator in the sidebar's SprintNavItem.
 */
export const MovingSprintContext = createContext<string | null>(null);
