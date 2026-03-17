
export const getChildBaseSelect = () => {
  // Core columns guaranteed to exist
  return 'id,name,age,grade,avatar,access_code,xp,stars,streak,difficulty_subjects,guardian_id';
};

export const getChildSafeSelect = () => {
  // All columns currently confirmed safe for production use
  // Excludes unstable flags like story_enabled/drawing_enabled until migration confirmed
  return `${getChildBaseSelect()},friends_enabled,friends_parent_approval_required,social_interactions_enabled,game_enabled,game_time_limit`;
};
