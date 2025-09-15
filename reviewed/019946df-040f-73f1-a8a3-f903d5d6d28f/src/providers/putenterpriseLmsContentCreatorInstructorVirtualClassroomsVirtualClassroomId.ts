import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsVirtualClassroom";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Update an existing virtual classroom session by ID within the tenant
 * organization.
 *
 * This operation modifies the session's metadata fields such as title,
 * description, start and end timestamps. Only the authorized content
 * creator/instructor associated with the tenant can perform updates.
 *
 * @param props - Object containing the authenticated content creator/instructor
 *   payload, the target virtual classroom ID, and the update data body.
 * @returns The updated virtual classroom session details.
 * @throws {Error} NotFound error if the virtual classroom session does not
 *   exist.
 * @throws {Error} Unauthorized error if the user is not the instructor of the
 *   session.
 */
export async function putenterpriseLmsContentCreatorInstructorVirtualClassroomsVirtualClassroomId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  virtualClassroomId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsVirtualClassroom.IUpdate;
}): Promise<IEnterpriseLmsVirtualClassroom> {
  const { contentCreatorInstructor, virtualClassroomId, body } = props;

  // Step 1: Fetch instructor record to obtain tenant_id
  const instructor =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUniqueOrThrow(
      {
        where: { id: contentCreatorInstructor.id },
        select: { id: true, tenant_id: true },
      },
    );

  // Step 2: Fetch virtual classroom record with matching id and tenant_id, and not deleted
  const virtualClassroom =
    await MyGlobal.prisma.enterprise_lms_virtual_classrooms.findFirstOrThrow({
      where: {
        id: virtualClassroomId,
        tenant_id: instructor.tenant_id,
        deleted_at: null,
      },
    });

  // Step 3: Authorization check: instructor_id matches user id
  if (virtualClassroom.instructor_id !== contentCreatorInstructor.id) {
    throw new Error(
      "Unauthorized: You can only update your own virtual classrooms",
    );
  }

  // Prepare the update data
  const updateData = {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.start_at !== undefined && { start_at: body.start_at }),
    ...(body.end_at !== undefined && { end_at: body.end_at }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Step 4: Perform update operation
  const updated =
    await MyGlobal.prisma.enterprise_lms_virtual_classrooms.update({
      where: { id: virtualClassroomId },
      data: updateData,
    });

  // Step 5: Return the updated record with date conversion and null handling
  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    instructor_id: updated.instructor_id,
    title: updated.title,
    description: updated.description ?? null,
    start_at: toISOStringSafe(updated.start_at),
    end_at: toISOStringSafe(updated.end_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
