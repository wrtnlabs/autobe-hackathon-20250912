import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSystemSettings";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Get detailed information of a single job performance evaluation system
 * setting by ID.
 *
 * Retrieves the system setting record matching the given UUID if not
 * soft-deleted. Requires the authenticated manager making the request to
 * exist.
 *
 * @param props - Object containing the manager payload and system setting ID
 * @param props.manager - Authenticated manager payload information
 * @param props.id - UUID of the system setting to retrieve
 * @returns The system setting record if found
 * @throws {Error} If the manager is unauthorized or does not exist
 * @throws {Error} If the system setting with the given ID is not found
 */
export async function getjobPerformanceEvalManagerSystemSettingsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalSystemSettings> {
  const { manager, id } = props;

  // Authorization verification: manager must exist and not be soft deleted
  const managerExists =
    await MyGlobal.prisma.job_performance_eval_managers.findFirst({
      where: { id: manager.id, deleted_at: null },
      select: { id: true },
    });

  if (!managerExists)
    throw new Error("Unauthorized: Manager not found or deleted");

  // Query job_performance_eval_system_settings with the provided id and not soft deleted
  const systemSetting =
    await MyGlobal.prisma.job_performance_eval_system_settings.findFirst({
      where: { id, deleted_at: null },
    });

  if (!systemSetting)
    throw new Error(`System setting with id '${id}' not found.`);

  // Return adhering strictly to IJobPerformanceEvalSystemSettings structure
  return {
    id: systemSetting.id,
    setting_key: systemSetting.setting_key,
    setting_value: systemSetting.setting_value,
    description: systemSetting.description ?? null,
    created_at: toISOStringSafe(systemSetting.created_at),
    updated_at: toISOStringSafe(systemSetting.updated_at),
    deleted_at: systemSetting.deleted_at
      ? toISOStringSafe(systemSetting.deleted_at)
      : null,
  };
}
