const jsonObject = {
  type: 'object',
  additionalProperties: true,
};

const jsonResponse = (description) => ({
  description,
  content: {
    'application/json': {
      schema: jsonObject,
    },
  },
});

const arrayResponse = (description) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'array',
        items: jsonObject,
      },
    },
  },
});

const pathParameter = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});

const jsonBody = (schema) => ({
  required: true,
  content: {
    'application/json': { schema },
  },
});

const responses = (successDescription, successCode = '200', successIsArray = false) => ({
  [successCode]: successIsArray
    ? arrayResponse(successDescription)
    : jsonResponse(successDescription),
  400: jsonResponse('Invalid request'),
  401: jsonResponse('Authentication required or token invalid'),
  500: jsonResponse('Server error'),
});

const protectedOperation = (operation) => ({
  ...operation,
  security: [{ bearerAuth: [] }],
});

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'FriendBook API',
    version: '1.0.0',
    description: 'API for FriendBook accounts, profiles, friends, posts, messages, notifications, and uploads.',
  },
  servers: [
    { url: '/', description: 'Current server' },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Friends' },
    { name: 'Posts' },
    { name: 'Notifications' },
    { name: 'Uploads' },
    { name: 'Messages' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API health',
        responses: {
          200: {
            description: 'API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/config': {
      get: {
        tags: ['Auth'],
        summary: 'Get public authentication configuration',
        responses: responses('Authentication configuration'),
      },
    },
    '/api/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        requestBody: jsonBody({
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Alex Friend' },
            email: { type: 'string', format: 'email', example: 'alex@example.com' },
            password: { type: 'string', format: 'password', example: 'your-password' },
          },
        }),
        responses: responses('Account created', '201'),
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password',
        requestBody: jsonBody({
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
          },
        }),
        responses: responses('Authenticated'),
      },
    },
    '/api/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with a Google credential',
        requestBody: jsonBody({
          type: 'object',
          required: ['credential'],
          properties: { credential: { type: 'string', description: 'Google identity token' } },
        }),
        responses: responses('Authenticated'),
      },
    },
    '/api/auth/password': {
      post: protectedOperation({
        tags: ['Auth'],
        summary: 'Set or change the current user password',
        requestBody: jsonBody({
          type: 'object',
          required: ['newPassword'],
          properties: {
            currentPassword: { type: 'string', format: 'password' },
            newPassword: { type: 'string', format: 'password', minLength: 6 },
          },
        }),
        responses: responses('Password updated'),
      }),
    },
    '/api/auth/me': {
      get: protectedOperation({
        tags: ['Auth'],
        summary: 'Get the current user',
        responses: responses('Current user'),
      }),
    },
    '/api/users/search': {
      get: protectedOperation({
        tags: ['Users'],
        summary: 'Search users',
        parameters: [{
          name: 'q',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Name or email search text',
        }],
        responses: responses('Matching users', '200', true),
      }),
    },
    '/api/users/profile/{id}': {
      get: protectedOperation({
        tags: ['Users'],
        summary: 'Get a user profile',
        parameters: [pathParameter('id', 'User ID')],
        responses: responses('User profile'),
      }),
    },
    '/api/users/profile': {
      put: protectedOperation({
        tags: ['Users'],
        summary: 'Update the current user profile',
        requestBody: jsonBody({
          type: 'object',
          properties: {
            name: { type: 'string' },
            bio: { type: 'string' },
            avatar: { type: 'string' },
            location: { type: 'string' },
            work: { type: 'string' },
            study: { type: 'string' },
            dob: { type: 'string' },
            relationship: { type: 'string' },
          },
        }),
        responses: responses('Updated profile'),
      }),
    },
    '/api/friends/status/{userId}': {
      get: protectedOperation({
        tags: ['Friends'],
        summary: 'Get friendship status with a user',
        parameters: [pathParameter('userId', 'Target user ID')],
        responses: responses('Friendship status'),
      }),
    },
    '/api/friends/request/{userId}': {
      post: protectedOperation({
        tags: ['Friends'],
        summary: 'Send a friend request',
        parameters: [pathParameter('userId', 'Recipient user ID')],
        responses: responses('Friend request created', '201'),
      }),
    },
    '/api/friends/requests': {
      get: protectedOperation({
        tags: ['Friends'],
        summary: 'List incoming pending friend requests',
        responses: responses('Pending friend requests', '200', true),
      }),
    },
    '/api/friends/requests/{requestId}/accept': {
      post: protectedOperation({
        tags: ['Friends'],
        summary: 'Accept a friend request',
        parameters: [pathParameter('requestId', 'Friend request ID')],
        responses: responses('Friend request accepted'),
      }),
    },
    '/api/friends/requests/{requestId}/reject': {
      post: protectedOperation({
        tags: ['Friends'],
        summary: 'Reject a friend request',
        parameters: [pathParameter('requestId', 'Friend request ID')],
        responses: responses('Friend request rejected'),
      }),
    },
    '/api/friends/{userId}': {
      delete: protectedOperation({
        tags: ['Friends'],
        summary: 'Remove a friend',
        parameters: [pathParameter('userId', 'Friend user ID')],
        responses: responses('Friend removed'),
      }),
    },
    '/api/posts': {
      post: protectedOperation({
        tags: ['Posts'],
        summary: 'Create a post',
        requestBody: jsonBody({
          type: 'object',
          properties: {
            text: { type: 'string' },
            photoUrl: { type: 'string', format: 'uri' },
          },
          description: 'Provide post text, a photo URL, or both.',
        }),
        responses: responses('Post created', '201'),
      }),
    },
    '/api/posts/home': {
      get: protectedOperation({
        tags: ['Posts'],
        summary: 'Get the home feed',
        responses: responses('Home feed posts', '200', true),
      }),
    },
    '/api/posts/wall': {
      get: protectedOperation({
        tags: ['Posts'],
        summary: 'Get the home feed (alias)',
        responses: responses('Home feed posts', '200', true),
      }),
    },
    '/api/posts/user/{userId}': {
      get: protectedOperation({
        tags: ['Posts'],
        summary: 'Get posts by a user',
        parameters: [pathParameter('userId', 'User ID')],
        responses: responses('User posts', '200', true),
      }),
    },
    '/api/posts/{postId}': {
      put: protectedOperation({
        tags: ['Posts'],
        summary: 'Update a post',
        parameters: [pathParameter('postId', 'Post ID')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            text: { type: 'string' },
            photoUrl: { type: 'string', format: 'uri' },
          },
        }),
        responses: responses('Updated post'),
      }),
      delete: protectedOperation({
        tags: ['Posts'],
        summary: 'Delete a post',
        parameters: [pathParameter('postId', 'Post ID')],
        responses: responses('Post deleted'),
      }),
    },
    '/api/posts/{postId}/like': {
      post: protectedOperation({
        tags: ['Posts'],
        summary: 'Like or unlike a post',
        parameters: [pathParameter('postId', 'Post ID')],
        responses: responses('Updated post'),
      }),
    },
    '/api/posts/{postId}/comments': {
      post: protectedOperation({
        tags: ['Posts'],
        summary: 'Add a comment to a post',
        parameters: [pathParameter('postId', 'Post ID')],
        requestBody: jsonBody({
          type: 'object',
          required: ['text'],
          properties: { text: { type: 'string' } },
        }),
        responses: responses('Comment added', '201'),
      }),
    },
    '/api/posts/{postId}/comments/{commentId}/like': {
      post: protectedOperation({
        tags: ['Posts'],
        summary: 'Like or unlike a comment',
        parameters: [
          pathParameter('postId', 'Post ID'),
          pathParameter('commentId', 'Comment ID'),
        ],
        responses: responses('Updated post'),
      }),
    },
    '/api/notifications': {
      get: protectedOperation({
        tags: ['Notifications'],
        summary: 'List notifications',
        responses: responses('Notifications', '200', true),
      }),
    },
    '/api/notifications/unread-count': {
      get: protectedOperation({
        tags: ['Notifications'],
        summary: 'Get unread notification count',
        responses: responses('Unread notification count'),
      }),
    },
    '/api/notifications/status': {
      get: protectedOperation({
        tags: ['Notifications'],
        summary: 'Get notification status',
        responses: responses('Notification status'),
      }),
    },
    '/api/notifications/{id}/read': {
      post: protectedOperation({
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        parameters: [pathParameter('id', 'Notification ID')],
        responses: responses('Notification marked as read'),
      }),
    },
    '/api/upload/image': {
      post: protectedOperation({
        tags: ['Uploads'],
        summary: 'Upload an image',
        parameters: [{
          name: 'type',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['profile', 'post'] },
          description: 'Choose the profile or post upload folder',
        }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: responses('Image uploaded', '201'),
      }),
    },
    '/api/messages/friends': {
      get: protectedOperation({
        tags: ['Messages'],
        summary: 'List friends available for messaging',
        responses: responses('Friends', '200', true),
      }),
    },
    '/api/messages/unread-count': {
      get: protectedOperation({
        tags: ['Messages'],
        summary: 'Get unread message count',
        responses: responses('Unread message count'),
      }),
    },
    '/api/messages/{friendId}': {
      get: protectedOperation({
        tags: ['Messages'],
        summary: 'Get conversation with a friend',
        parameters: [pathParameter('friendId', 'Friend user ID')],
        responses: responses('Conversation messages', '200', true),
      }),
      post: protectedOperation({
        tags: ['Messages'],
        summary: 'Send a message to a friend',
        parameters: [pathParameter('friendId', 'Friend user ID')],
        requestBody: jsonBody({
          type: 'object',
          required: ['text'],
          properties: { text: { type: 'string' } },
        }),
        responses: responses('Message sent', '201'),
      }),
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Log in or sign up, then authorize with the returned JWT.',
      },
    },
  },
};

module.exports = openapi;
