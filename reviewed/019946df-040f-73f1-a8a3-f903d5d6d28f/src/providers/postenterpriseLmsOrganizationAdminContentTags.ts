import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new content tag for content classification within the enterprise
 * LMS.
 *
 * This operation adds a new content tag with a unique code and human-readable
 * name, optionally including a description to aid in categorization. The
 * creation is restricted to authorized organization administrators.
 *
 * @param props - Object containing the authenticated organizationAdmin and the
 *   content tag creation data.
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation.
 * @param props.body - The creation data for the new content tag.
 * @returns The newly created content tag entity.
 * @throws {Error} Throws error if there is a database constraint violation such
 *   as duplicate code or other Prisma errors.
 */
export async function postenterpriseLmsOrganizationAdminContentTags(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsContentTag.ICreate;
}): Promise<IEnterpriseLmsContentTag> {
  const { organizationAdmin, body } = props;

  // Generate a new UUID for the tag id
  const id = v4();

  // Create the new content tag record in database
  const created = await MyGlobal.prisma.enterprise_lms_content_tags.create({
    data: {
      id: id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
    },
  });

  // Return the created tag entity matching the API type
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
  };
}
