import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Update an existing content item's metadata by its ID.
 *
 * Updates fields: title, description, content_type, status, business_status.
 * Ensures the content belongs to the user's tenant (authorization). Validates
 * uniqueness of title within tenant excluding current content. Does NOT allow
 * modifying soft deletion timestamps.
 *
 * @param props - Object containing contentCreatorInstructor payload, content
 *   id, and update body
 * @returns Updated content item with all fields and ISO date strings
 * @throws {Error} Content not found
 * @throws {Error} Unauthorized access if tenant mismatch
 * @throws {Error} Title already exists in tenant
 */
export async function putenterpriseLmsContentCreatorInstructorContentsId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContents.IUpdate;
}): Promise<IEnterpriseLmsContents> {
  const { contentCreatorInstructor, id, body } = props;

  // Find existing content item
  const existingContent =
    await MyGlobal.prisma.enterprise_lms_contents.findUnique({
      where: { id },
    });
  if (!existingContent) {
    throw new Error("Content not found");
  }

  // Authorization: verify ownership by tenant
  if (existingContent.tenant_id !== contentCreatorInstructor.id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Validate title uniqueness within tenant
  if (body.title !== undefined) {
    const conflict = await MyGlobal.prisma.enterprise_lms_contents.findFirst({
      where: {
        tenant_id: existingContent.tenant_id,
        title: body.title,
        id: { not: id },
      },
    });
    if (conflict !== null) {
      throw new Error("Title already exists in tenant");
    }
  }

  // Update with allowed fields
  const updated = await MyGlobal.prisma.enterprise_lms_contents.update({
    where: { id },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      content_type: body.content_type ?? undefined,
      status: body.status ?? undefined,
      business_status: body.business_status ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated content with correct date formatting
  return {
    id: updated.id as string & tags.Format<"uuid">,
    tenant_id: updated.tenant_id as string & tags.Format<"uuid">,
    title: updated.title,
    description: updated.description ?? null,
    content_type: updated.content_type,
    status: updated.status,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
