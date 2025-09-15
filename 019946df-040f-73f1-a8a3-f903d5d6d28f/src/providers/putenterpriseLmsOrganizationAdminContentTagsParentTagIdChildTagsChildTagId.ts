import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing child tag relationship between a parent tag and its child
 * tag.
 *
 * This operation updates the content tag hierarchy record identified by the
 * specified parentTagId and childTagId path parameters. It modifies the parent
 * or child tag references according to the provided update input.
 *
 * Requires authorization as an organization administrator.
 *
 * @param props - Object containing the organization admin payload, path
 *   parameters, and update body
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload
 * @param props.parentTagId - UUID of the parent content tag
 * @param props.childTagId - UUID of the child content tag
 * @param props.body - Update payload with optional new parent_tag_id or
 *   child_tag_id
 * @returns The updated content tag hierarchy record
 * @throws {Error} When the specified tag relationship does not exist
 */
export async function putenterpriseLmsOrganizationAdminContentTagsParentTagIdChildTagsChildTagId(props: {
  organizationAdmin: OrganizationadminPayload;
  parentTagId: string & tags.Format<"uuid">;
  childTagId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentTagHierarchy.IUpdate;
}): Promise<IEnterpriseLmsContentTagHierarchy> {
  const { organizationAdmin, parentTagId, childTagId, body } = props;

  const existing =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.findFirst({
      where: {
        parent_tag_id: parentTagId,
        child_tag_id: childTagId,
      },
    });

  if (existing === null) {
    throw new Error("Tag relationship not found");
  }

  const data: IEnterpriseLmsContentTagHierarchy.IUpdate = {
    parent_tag_id:
      body.parent_tag_id === null ? null : (body.parent_tag_id ?? undefined),
    child_tag_id:
      body.child_tag_id === null ? null : (body.child_tag_id ?? undefined),
  };

  const updated =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.update({
      where: { id: existing.id },
      data,
    });

  return {
    id: updated.id,
    parent_tag_id: updated.parent_tag_id,
    child_tag_id: updated.child_tag_id,
    created_at: toISOStringSafe(updated.created_at),
  };
}
