import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentAccessControl";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing content access control entry by ID.
 *
 * This function updates the allowed roles and learners for a content access
 * control entry identified by the given ID. Authorization is restricted to
 * organization administrators, and tenant ownership is enforced by checking
 * that the content access control's tenant matches the user's tenant.
 *
 * @param props - Object containing organizationAdmin auth payload, content
 *   access control ID, and update body
 * @returns The updated content access control record with all fields
 * @throws {Error} Unauthorized access if the tenant does not match the org
 *   admin
 * @throws {Error} If the content access control record with given ID does not
 *   exist
 */
export async function putenterpriseLmsOrganizationAdminContentAccessControlsId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentAccessControl.IUpdate;
}): Promise<IEnterpriseLmsContentAccessControl> {
  const { organizationAdmin, id, body } = props;

  // Fetch existing record
  const existing =
    await MyGlobal.prisma.enterprise_lms_content_access_controls.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Authorization check: verify organizationAdmin owns the same tenant
  if (existing.tenant_id !== organizationAdmin.id) {
    throw new Error("Unauthorized: tenant mismatch");
  }

  // Perform update
  const updated =
    await MyGlobal.prisma.enterprise_lms_content_access_controls.update({
      where: { id },
      data: {
        allowed_roles: body.allowed_roles ?? undefined,
        allowed_learners: body.allowed_learners ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return converted object
  return {
    id: updated.id,
    content_id: updated.content_id,
    tenant_id: updated.tenant_id,
    allowed_roles: updated.allowed_roles ?? null,
    allowed_learners: updated.allowed_learners ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
