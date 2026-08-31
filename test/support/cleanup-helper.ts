interface DeletableModel {
  deleteMany(args: { where: { id: { in: string[] } } }): Promise<unknown>;
}

export async function safeDeleteByIds(
  model: DeletableModel,
  ids: Array<string | null | undefined>,
): Promise<void> {
  const validIds = ids.filter((id): id is string => Boolean(id));
  if (validIds.length === 0) return;
  await model.deleteMany({ where: { id: { in: validIds } } });
}
