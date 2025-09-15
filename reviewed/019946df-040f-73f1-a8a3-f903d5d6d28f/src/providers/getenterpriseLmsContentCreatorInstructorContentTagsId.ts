import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Retrieves detailed information about a specific content tag by its unique
 * identifier.
 *
 * This operation is restricted to authenticated contentCreatorInstructor users.
 *
 * @param props - The request properties containing authentication and path
 *   parameter
 * @param props.contentCreatorInstructor - The authenticated content creator
 *   instructor payload
 * @param props.id - The UUID of the content tag to retrieve
 * @returns The detailed content tag entity
 * @throws {Error} If the specified content tag ID does not exist (404 error)
 */
export async function getenterpriseLmsContentCreatorInstructorContentTagsId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentTag> {
  const { id } = props;

  const contentTag =
    await MyGlobal.prisma.enterprise_lms_content_tags.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: contentTag.id,
    code: contentTag.code,
    name: contentTag.name,
    description: contentTag.description ?? null,
  };
}
