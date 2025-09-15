import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Creates a new child content tag relationship linking a child tag to a parent
 * tag within the enterprise learning management system.
 *
 * Validates that both tags exist and belong to the same tenant as the
 * authenticated organization administrator.
 *
 * Ensures no duplicate relationships are created.
 *
 * @param props - Object containing the authenticated organization admin, the
 *   parent tag ID, and the payload body with the child_tag_id.
 * @returns The newly created content tag hierarchy record with metadata.
 * @throws {Error} Throws if validation fails, including non-existent tags,
 *   tenant mismatches, unauthorized access, or duplicate relationship
 *   attempts.
 */
export async function postenterpriseLmsOrganizationAdminContentTagsParentTagIdChildTags(props: {
  organizationAdmin: OrganizationadminPayload;
  parentTagId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentTagHierarchy.ICreate;
}): Promise<IEnterpriseLmsContentTagHierarchy> {
  const { organizationAdmin, parentTagId, body } = props;

  // Fetch organizationAdmin data including tenant_id to verify access
  const adminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
    });

  // Verify the parent tag exists
  const parentTag =
    await MyGlobal.prisma.enterprise_lms_content_tags.findUniqueOrThrow({
      where: { id: parentTagId },
    });

  // Verify the child tag exists
  const childTag =
    await MyGlobal.prisma.enterprise_lms_content_tags.findUniqueOrThrow({
      where: { id: body.child_tag_id },
    });

  // Check tenant consistency for admin, parent, and child tags
  if (
    adminRecord.tenant_id !== parentTag.tenant_id ||
    adminRecord.tenant_id !== childTag.tenant_id
  ) {
    throw new Error("Unauthorized: Tenant mismatch between admin and tags");
  }

  // Check existing relation to prevent duplicate child-tag hierarchy
  const existingRelation =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.findFirst({
      where: {
        parent_tag_id: parentTagId,
        child_tag_id: body.child_tag_id,
      },
    });

  if (existingRelation) {
    throw new Error(`Child tag relationship already exists.`);
  }

  // Prepare new ID and timestamp
  const newId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the new hierarchy entry
  const created =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.create({
      data: {
        id: newId,
        parent_tag_id: parentTagId,
        child_tag_id: body.child_tag_id,
        created_at: now,
      },
    });

  return {
    id: created.id,
    parent_tag_id: created.parent_tag_id,
    child_tag_id: created.child_tag_id,
    created_at: toISOStringSafe(created.created_at),
  };
}
