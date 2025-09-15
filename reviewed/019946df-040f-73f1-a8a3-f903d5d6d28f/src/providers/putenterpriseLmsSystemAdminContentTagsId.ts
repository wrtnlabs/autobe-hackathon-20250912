import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a content tag by its unique ID.
 *
 * This operation modifies the tag's identifying code, name, and optional
 * description within the content management system. Authorization is enforced
 * to allow only system administrators to perform this update.
 *
 * @param props - Object containing systemAdmin payload, content tag ID, and
 *   update body
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the update
 * @param props.id - UUID of the content tag to update
 * @param props.body - Partial update data conforming to
 *   IEnterpriseLmsContentTag.IUpdate
 * @returns The updated content tag data conforming to IEnterpriseLmsContentTag
 * @throws {Error} Throws if the content tag with the specified ID does not
 *   exist
 * @throws {Prisma.PrismaClientKnownRequestError} Throws for database errors
 *   like unique constraint violation
 */
export async function putenterpriseLmsSystemAdminContentTagsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentTag.IUpdate;
}): Promise<IEnterpriseLmsContentTag> {
  const { systemAdmin, id, body } = props;

  // Verify the content tag exists
  await MyGlobal.prisma.enterprise_lms_content_tags.findUniqueOrThrow({
    where: { id },
  });

  // Update the content tag with provided fields
  const updated = await MyGlobal.prisma.enterprise_lms_content_tags.update({
    where: { id },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description:
        body.description === null ? null : (body.description ?? undefined),
    },
  });

  // Return the updated content tag
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
  };
}
