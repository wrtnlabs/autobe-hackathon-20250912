import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Create a new content tag for content classification within the enterprise
 * LMS.
 *
 * This operation allows authorized contentCreatorInstructor users to create a
 * content tag within the system to classify and organize learning content.
 *
 * @param props - The request properties including
 *
 *   - ContentCreatorInstructor: Authenticated content creator instructor payload
 *   - Body: Content tag creation data containing unique code, name, and optional
 *       description
 *
 * @returns The newly created content tag
 * @throws {Error} When the creation fails due to duplicates or other database
 *   errors
 */
export async function postenterpriseLmsContentCreatorInstructorContentTags(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsContentTag.ICreate;
}): Promise<IEnterpriseLmsContentTag> {
  const { contentCreatorInstructor, body } = props;

  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.enterprise_lms_content_tags.create({
    data: {
      id: newId,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
    },
  });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
  };
}
