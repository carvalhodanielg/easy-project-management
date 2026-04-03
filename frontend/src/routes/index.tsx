import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { HomePage } from '../pages/home/HomePage';
import { SpaceLayout } from '../pages/space/SpaceLayout';
import { ListPage } from '../pages/list/ListPage';
import { SprintPage } from '../pages/sprint/SprintPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/home" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/home', element: <HomePage /> },
      {
        path: '/spaces/:spaceId',
        element: <SpaceLayout />,
        children: [
          { path: 'lists/:listId', element: <ListPage /> },
          { path: 'sprints/:sprintId', element: <SprintPage /> },
        ],
      },
    ],
  },
]);
