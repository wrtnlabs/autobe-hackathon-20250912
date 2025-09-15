import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Creates a new content item in the enterprise LMS system.
 *
 * This endpoint allows an authorized Content Creator or Instructor user to
 * create training content within their tenant organization. The content
 * includes title, description, content type, status, and business lifecycle
 * state.
 *
 * @param props - Object containing the authenticated Content Creator/Instructor
 *   and the new content creation data.
 * @param props.contentCreatorInstructor - Authenticated user with content
 *   creator permissions.
 * @param props.body - Content item creation details including tenant ID, title,
 *   description, content type, status, and business status.
 * @returns The newly created content item with full metadata and timestamps.
 * @throws {Error} Throws error if Prisma operation fails (e.g., due to title
 *   uniqueness violation).
 */
export async function postenterpriseLmsContentCreatorInstructorContents(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsContents.ICreate;
}): Promise<IEnterpriseLmsContents> {
  const { contentCreatorInstructor, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_contents.create({
    data: {
      id,
      tenant_id: body.tenant_id,
      title: body.title,
      description: body.description ?? null,
      content_type: body.content_type,
      status: body.status,
      business_status: body.business_status,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    tenant_id: created.tenant_id as string & tags.Format<"uuid">,
    title: created.title,
    description: created.description ?? null,
    content_type: created.content_type,
    status: created.status,
    business_status: created.business_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
