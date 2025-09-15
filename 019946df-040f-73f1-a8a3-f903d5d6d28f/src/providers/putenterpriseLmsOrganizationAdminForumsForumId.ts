import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update forum details by forumId
 *
 * This operation updates the details of an existing discussion forum identified
 * by its unique forum ID within the Enterprise LMS tenant context. It modifies
 * forum metadata such as name and description, ensuring the tenant and owner
 * associations remain consistent. The operation updates the
 * 'enterprise_lms_forums' table, enforcing unique name constraints per tenant
 * and preserving data isolation.
 *
 * Authorization to modify is restricted to organization administrators
 * maintaining security and correct ownership.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization administrator
 * @param props.forumId - UUID of the forum to update
 * @param props.body - Forum update data including optional name, description,
 *   deleted_at
 * @returns The updated forum record
 * @throws {Error} When forum not found
 * @throws {Error} When unauthorized due to tenant or ownership mismatch
 * @throws {Error} When forum name duplicates an existing forum within the
 *   tenant
 */
export async function putenterpriseLmsOrganizationAdminForumsForumId(props: {
  organizationAdmin: OrganizationadminPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForums.IUpdate;
}): Promise<IEnterpriseLmsForums> {
  const { organizationAdmin, forumId, body } = props;

  // Fetch the forum to update
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUnique({
    where: { id: forumId },
  });
  if (!forum) throw new Error("Forum not found");

  // Fetch the organization admin's tenant_id for authorization
  const adminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true },
    });

  if (!adminRecord) {
    throw new Error("Unauthorized: Organization admin record not found");
  }

  // Check tenant ownership
  if (forum.tenant_id !== adminRecord.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Check ownership of forum
  if (forum.owner_id !== organizationAdmin.id) {
    throw new Error("Unauthorized: Only owner can update the forum");
  }

  // Check for duplicate forum name within the tenant
  if (body.name) {
    const duplicate = await MyGlobal.prisma.enterprise_lms_forums.findFirst({
      where: {
        tenant_id: forum.tenant_id,
        name: body.name,
        id: { not: forumId },
      },
    });
    if (duplicate) {
      throw new Error("Forum name must be unique within the tenant");
    }
  }

  // Prepare updated fields
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.enterprise_lms_forums.update({
    where: { id: forumId },
    data: {
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: now,
    },
  });

  // Return with dates converted properly
  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    owner_id: updated.owner_id,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
