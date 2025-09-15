import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentAccessControl";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific content access control by ID
 *
 * ThisGET endpoint fetches a single content access control by unique
 * identifier. It returns detailed data including allowed roles, allowed learner
 * IDs, and metadata timestamps. Authorization is limited to organization
 * administrators managing tenant-wide access policies.
 *
 * @param props - Object containing:
 *
 *   - OrganizationAdmin: The authenticated organization administrator making the
 *       request
 *   - Id: Unique identifier of the content access control
 *
 * @returns Detailed content access control information
 * @throws Error when unauthorized or record not found
 */
export async function getenterpriseLmsOrganizationAdminContentAccessControlsId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentAccessControl> {
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: props.organizationAdmin.id },
    });
  if (!admin) throw new Error("Unauthorized: organization admin not found");

  const accessControl =
    await MyGlobal.prisma.enterprise_lms_content_access_controls.findUnique({
      where: { id: props.id },
    });
  if (!accessControl) throw new Error("Content access control not found");

  if (accessControl.tenant_id !== admin.tenant_id) {
    throw new Error(
      "Unauthorized: access control does not belong to your tenant",
    );
  }

  return {
    id: accessControl.id,
    content_id: accessControl.content_id,
    tenant_id: accessControl.tenant_id,
    allowed_roles: accessControl.allowed_roles ?? undefined,
    allowed_learners: accessControl.allowed_learners ?? undefined,
    created_at: toISOStringSafe(accessControl.created_at),
    updated_at: toISOStringSafe(accessControl.updated_at),
  };
}
