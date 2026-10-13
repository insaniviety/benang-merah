export function accountWorkspaceKey(userId: string): string {
  if (!userId.trim()) throw new Error("An authenticated account is required");
  return `account:${userId}`;
}