export function needsEditorConfirmation(unconfirmedStoryIds: string[], activeStoryId: string, storageStatus: string) {
  return unconfirmedStoryIds.includes(activeStoryId) || storageStatus !== "saved";
}