import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsVirtualClassroom";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Creates a new virtual classroom session for live training within the tenant
 * organization.
 *
 * Enforces tenant isolation and authorization by verifying the instructor is
 * the authenticated content creator/instructor and belongs to the specified
 * tenant.
 *
 * Stores session metadata including title, optional description, start and end
 * times.
 *
 * @param props - Object containing authenticated contentCreatorInstructor
 *   payload and request body
 * @param props.contentCreatorInstructor - Authenticated content
 *   creator/instructor user
 * @param props.body - Request body with virtual classroom creation data
 * @returns The created virtual classroom session entity
 * @throws {Error} If the instructor_id or tenant_id does not match the
 *   authenticated user
 */
export async function postenterpriseLmsContentCreatorInstructorVirtualClassrooms(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsVirtualClassroom.ICreate;
}): Promise<IEnterpriseLmsVirtualClassroom> {
  const { contentCreatorInstructor, body } = props;

  if (contentCreatorInstructor.id !== body.instructor_id) {
    throw new Error(
      "Unauthorized: instructor_id does not match authenticated user",
    );
  }

  if (contentCreatorInstructor.tenant_id !== body.tenant_id) {
    throw new Error(
      "Unauthorized: tenant_id does not match authenticated user's tenant",
    );
  }

  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.enterprise_lms_virtual_classrooms.create({
      data: {
        id: id,
        tenant_id: body.tenant_id,
        instructor_id: body.instructor_id,
        title: body.title,
        description: body.description ?? null,
        start_at: body.start_at,
        end_at: body.end_at,
      },
    });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    instructor_id: created.instructor_id,
    title: created.title,
    description: created.description ?? null,
    start_at: toISOStringSafe(created.start_at),
    end_at: toISOStringSafe(created.end_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
