import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentAccessControl";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new content access control entry within the Enterprise LMS.
 *
 * This operation inserts a new record into the
 * enterprise_lms_content_access_controls table to define access permissions for
 * specific content items within a tenant.
 *
 * Only authenticated organization administrators are authorized to perform this
 * operation.
 *
 * @param props - Object containing the organization administrator and the
 *   content access control creation data
 * @param props.organizationAdmin - Authenticated organization administrator
 *   performing the creation
 * @param props.body - Creation data for the content access control entry
 * @returns The newly created content access control record with all properties
 *   populated
 * @throws {Error} If the database operation fails or constraints are violated
 */
export async function postenterpriseLmsOrganizationAdminContentAccessControls(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsContentAccessControl.ICreate;
}): Promise<IEnterpriseLmsContentAccessControl> {
  const { organizationAdmin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.enterprise_lms_content_access_controls.create({
      data: {
        id,
        content_id: body.content_id,
        tenant_id: body.tenant_id,
        allowed_roles: body.allowed_roles ?? null,
        allowed_learners: body.allowed_learners ?? null,
        created_at: body.created_at,
        updated_at: body.updated_at,
      },
    });

  return {
    id: created.id,
    content_id: created.content_id,
    tenant_id: created.tenant_id,
    allowed_roles: created.allowed_roles ?? null,
    allowed_learners: created.allowed_learners ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
