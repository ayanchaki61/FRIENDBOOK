export function getUserProfileId(user) {
  return user?._id || user?.id || '';
}

export function navigateToUserProfile(navigate, profileUser, currentUser) {
  const profileId = getUserProfileId(profileUser);
  const currentUserId = getUserProfileId(currentUser);

  if (!profileId) return;
  if (currentUserId && String(profileId) === String(currentUserId)) {
    navigate('/profile');
    return;
  }

  navigate(`/profile/${profileId}`);
}

export function navigateToProfileId(navigate, profileId, currentUser) {
  if (!profileId) return;
  const currentUserId = getUserProfileId(currentUser);

  if (currentUserId && String(profileId) === String(currentUserId)) {
    navigate('/profile');
    return;
  }

  navigate(`/profile/${profileId}`);
}
