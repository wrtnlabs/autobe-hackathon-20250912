import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed Organization Administrator user
 *
 * This endpoint returns full details of an Organization Administrator user by
 * unique identifier. Only accessible by systemAdmin and organizationAdmin
 * roles.
 *
 * @param props - Properties including systemAdmin payload and
 *   organizationadminId path parameter
 * @returns Detailed Organization Administrator user information as
 *   IEnterpriseLmsOrganizationAdmin
 * @throws {Error} If the specified organization administrator does not exist
 */
export async function getenterpriseLmsSystemAdminOrganizationadminsOrganizationadminId(props: {
  systemAdmin: SystemadminPayload;
  organizationadminId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsOrganizationAdmin> {
  const { systemAdmin, organizationadminId } = props;

  const organizationAdmin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationadminId },
    });

  return {
    id: organizationAdmin.id,
    tenant_id: organizationAdmin.tenant_id,
    email: organizationAdmin.email,
    password_hash: organizationAdmin.password_hash,
    first_name: organizationAdmin.first_name,
    last_name: organizationAdmin.last_name,
    status: organizationAdmin.status,
    created_at: toISOStringSafe(organizationAdmin.created_at),
    updated_at: toISOStringSafe(organizationAdmin.updated_at),
    deleted_at: organizationAdmin.deleted_at
      ? toISOStringSafe(organizationAdmin.deleted_at)
      : null,
  };
}
