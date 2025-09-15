import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Get detailed LMS role permission by ID
 *
 * Retrieves complete information about a single LMS role permission identified
 * by the given ID.
 *
 * Requires authenticated contentCreatorInstructor access.
 *
 * @param props - Request properties
 * @param props.contentCreatorInstructor - Authenticated content
 *   creator/instructor payload
 * @param props.id - Unique identifier of the role permission
 * @returns Detailed role permission information
 * @throws {Error} Throws if the role permission with the specified ID does not
 *   exist
 */
export async function getenterpriseLmsContentCreatorInstructorRolePermissionsId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsRolePermissions> {
  const record =
    await MyGlobal.prisma.enterprise_lms_role_permissions.findFirstOrThrow({
      where: { id: props.id },
    });

  return {
    id: record.id,
    role_id: record.role_id,
    permission_key: record.permission_key,
    description: record.description === null ? null : record.description,
    is_allowed: record.is_allowed,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
