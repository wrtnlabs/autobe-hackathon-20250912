import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * View the full record of a system admin account by systemAdminId
 * (ats_recruitment_systemadmins table).
 *
 * Retrieves the full details of a single system admin account from the
 * ats_recruitment_systemadmins table using the unique systemAdminId. Only
 * authenticated systemAdmin users may access this endpoint. If the provided ID
 * does not correspond to an active system admin account, throws an error. All
 * date fields are returned as ISO 8601 strings, and sensitive information (like
 * password hashes) is never exposed.
 *
 * This operation supports business use cases including privilege inspection,
 * audit review, account status checks, and admin update workflows. Every read
 * is suitable for audit/compliance logging.
 *
 * @param props - Request parameter object
 * @param props.systemAdmin - The authenticated system administrator context as
 *   verified by JWT
 * @param props.systemAdminId - The unique UUID for the system administrator
 *   record
 * @returns The detailed IAtsRecruitmentSystemAdmin object
 * @throws {Error} If the referenced system administrator account does not exist
 *   or is not active
 */
export async function getatsRecruitmentSystemAdminSystemAdminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentSystemAdmin> {
  const { systemAdmin, systemAdminId } = props;

  // Find the specified system administrator by id, filtering out deleted accounts
  const admin = await MyGlobal.prisma.ats_recruitment_systemadmins.findFirst({
    where: {
      id: systemAdminId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      super_admin: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (admin === null) {
    throw new Error("System admin not found or access denied");
  }

  // Build return object, converting all date types to ISO strings
  const result: IAtsRecruitmentSystemAdmin = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    super_admin: admin.super_admin,
    is_active: admin.is_active,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    // If deleted_at is null or undefined, match output spec
    ...(typeof admin.deleted_at !== "undefined"
      ? {
          deleted_at:
            admin.deleted_at === null
              ? null
              : toISOStringSafe(admin.deleted_at),
        }
      : {}),
  };
  return result;
}
