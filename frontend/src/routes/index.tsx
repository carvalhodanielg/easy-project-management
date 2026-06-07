import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { AcceptInvitePage } from '../pages/invite/AcceptInvitePage';
import { HomePage } from '../pages/home/HomePage';
import { SpaceLayout } from '../pages/space/SpaceLayout';
import { ListPage } from '../pages/list/ListPage';
import { SprintPage } from '../pages/sprint/SprintPage';
import { SprintListPage } from '../pages/sprint/SprintListPage';
import { MembersPage } from '../pages/members/MembersPage';
import { TaskDetailPage } from '../pages/task/TaskDetailPage';
import { WikiFolderPage } from '../pages/wiki/WikiFolderPage';
import { WikiDocumentPage } from '../pages/wiki/WikiDocumentPage';
import { NoteDetailPage } from '../pages/notes/NoteDetailPage';
import { SpaceHomePage } from '../pages/space/SpaceHomePage';
import { ProfilePage } from '../pages/profile/ProfilePage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/home" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/invite/accept', element: <AcceptInvitePage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/home', element: <HomePage /> },
      { path: '/profile', element: <ProfilePage /> },
      {
        path: '/spaces/:spaceId',
        element: <SpaceLayout />,
        children: [
          { index: true, element: <SpaceHomePage /> },
          { path: 'members', element: <MembersPage /> },
          { path: 'lists/:listId', element: <ListPage /> },
          { path: 'sprints', element: <SprintListPage /> },
          { path: 'sprints/:sprintId', element: <SprintPage /> },
          { path: 'tasks/:taskId', element: <TaskDetailPage /> },
          { path: 'wiki/folders/:folderId', element: <WikiFolderPage /> },
          { path: 'wiki/documents/:documentId', element: <WikiDocumentPage /> },
          { path: 'notes/:noteId', element: <NoteDetailPage /> },
        ],
      },
    ],
  },
]);
