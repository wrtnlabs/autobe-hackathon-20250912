import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information about a specific content tag by its unique
 * identifier.
 *
 * This operation is restricted to users with content management roles such as
 * organizationAdmin. It ensures that the content tag belongs to the tenant
 * organization of the requesting admin to enforce data isolation.
 *
 * @param props - Object containing the authenticated organizationAdmin and the
 *   tag ID.
 * @param props.organizationAdmin - Authenticated organizationAdmin user.
 * @param props.id - UUID of the content tag to retrieve.
 * @returns Detailed content tag entity conforming to IEnterpriseLmsContentTag.
 * @throws {Error} Throws an error if the organizationAdmin is not found or the
 *   content tag is not found within the tenant.
 */
export async function getenterpriseLmsOrganizationAdminContentTagsId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentTag> {
  // Fetch the organizationAdmin info with tenant_id
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: props.organizationAdmin.id },
      select: { tenant_id: true },
    });

  // Find the content tag by id and tenant_id for tenant isolation
  const contentTag =
    await MyGlobal.prisma.enterprise_lms_content_tags.findFirst({
      where: {
        id: props.id,
        tenant_id: admin.tenant_id,
      },
    });

  if (!contentTag) {
    throw new Error("Content tag not found");
  }

  return {
    id: contentTag.id,
    code: contentTag.code,
    name: contentTag.name,
    description: contentTag.description ?? null,
  };
}
