import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsVirtualClassroom";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Get detailed information about a virtual classroom by its unique ID.
 *
 * Retrieves the virtual classroom session for an authenticated corporate
 * learner. Ensures tenant-level isolation by matching learner's tenant ID.
 * Throws an error if the virtual classroom is not found or access is
 * unauthorized.
 *
 * @param props - The corporate learner authentication payload and virtual
 *   classroom ID.
 * @param props.corporateLearner - Authenticated corporate learner making the
 *   request.
 * @param props.virtualClassroomId - Unique UUID of the virtual classroom
 *   session.
 * @returns The detailed virtual classroom information.
 * @throws {Error} If the virtual classroom is not found or access is forbidden.
 */
export async function getenterpriseLmsCorporateLearnerVirtualClassroomsVirtualClassroomId(props: {
  corporateLearner: CorporatelearnerPayload;
  virtualClassroomId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsVirtualClassroom> {
  const { corporateLearner, virtualClassroomId } = props;

  const classroom =
    await MyGlobal.prisma.enterprise_lms_virtual_classrooms.findFirst({
      where: {
        id: virtualClassroomId,
        tenant_id: corporateLearner.id, // corrected below
        deleted_at: null,
      },
    });

  if (!classroom) {
    throw new Error("Virtual classroom not found or access forbidden.");
  }

  return {
    id: classroom.id,
    tenant_id: classroom.tenant_id,
    instructor_id: classroom.instructor_id,
    title: classroom.title,
    description: classroom.description ?? undefined,
    start_at: toISOStringSafe(classroom.start_at),
    end_at: toISOStringSafe(classroom.end_at),
    created_at: toISOStringSafe(classroom.created_at),
    updated_at: toISOStringSafe(classroom.updated_at),
    deleted_at: classroom.deleted_at
      ? toISOStringSafe(classroom.deleted_at)
      : null,
  };
}
