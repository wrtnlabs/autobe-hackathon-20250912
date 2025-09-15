import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed Organization Administrator user
 *
 * Retrieves full details of an Organization Administrator user by their unique
 * identifier. This operation ensures the user is active and not soft-deleted.
 * Requires the requesting user to be an organizationAdmin or systemAdmin.
 *
 * @param props - Object containing authentication info and target organization
 *   admin ID
 * @param props.organizationAdmin - The authenticated organization administrator
 *   making the request
 * @param props.organizationadminId - The unique identifier of the target
 *   organization administrator
 * @returns The Organization Administrator's full details excluding sensitive
 *   data like password_hash
 * @throws {Error} When the requested Organization Administrator does not exist
 *   or is not active
 */
export async function getenterpriseLmsOrganizationAdminOrganizationadminsOrganizationadminId(props: {
  organizationAdmin: OrganizationadminPayload;
  organizationadminId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsOrganizationAdmin> {
  const target =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findFirstOrThrow({
      where: {
        id: props.organizationadminId,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
        tenant_id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: target.id,
    tenant_id: target.tenant_id,
    email: target.email,
    first_name: target.first_name,
    last_name: target.last_name,
    status: target.status,
    created_at: toISOStringSafe(target.created_at),
    updated_at: toISOStringSafe(target.updated_at),
    deleted_at: target.deleted_at ? toISOStringSafe(target.deleted_at) : null,
  };
}
