import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve content creator/instructor details by ID
 *
 * This operation fetches a content creator/instructor user by their unique ID
 * within the tenant context of the organization administrator. It enforces
 * strict tenant isolation and excludes soft-deleted users.
 *
 * @param props - The input properties including organizationAdmin authorization
 *   payload and contentcreatorinstructorId.
 * @param props.organizationAdmin - The authorized organization administrator
 *   payload containing tenant information.
 * @param props.contentcreatorinstructorId - The UUID of the target content
 *   creator/instructor user.
 * @returns The content creator/instructor user profile information.
 * @throws {Error} If the content creator/instructor user is not found or access
 *   is unauthorized.
 */
export async function getenterpriseLmsOrganizationAdminContentcreatorinstructorsContentcreatorinstructorId(props: {
  organizationAdmin: OrganizationadminPayload;
  contentcreatorinstructorId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentCreatorInstructor> {
  const { organizationAdmin, contentcreatorinstructorId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findFirstOrThrow(
      {
        where: {
          id: contentcreatorinstructorId,
          tenant_id: organizationAdmin.tenant_id,
          deleted_at: null,
        },
      },
    );

  return {
    id: record.id,
    tenant_id: record.tenant_id,
    email: record.email as string & tags.Format<"email">,
    password_hash: record.password_hash,
    first_name: record.first_name,
    last_name: record.last_name,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
