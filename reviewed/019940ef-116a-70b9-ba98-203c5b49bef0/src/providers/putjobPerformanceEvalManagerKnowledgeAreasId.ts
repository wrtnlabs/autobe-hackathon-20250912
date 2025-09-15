import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalKnowledgeArea";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update a knowledge area by ID in the job_performance_eval_knowledge_areas
 * table.
 *
 * This endpoint allows an authenticated manager to update attributes of a
 * specific knowledge area, including code, name, description, and soft delete
 * timestamp.
 *
 * It ensures that the knowledge area exists and is not soft deleted before
 * performing the update. The updated_at timestamp is automatically set to the
 * current time.
 *
 * @param props - Properties including authenticated manager, knowledge area id,
 *   and update data
 * @param props.manager - Authenticated manager making the request
 * @param props.id - UUID of the knowledge area to update
 * @param props.body - Partial update data for the knowledge area
 * @returns Updated knowledge area entity
 * @throws {Error} When the knowledge area is not found or has been deleted
 */
export async function putjobPerformanceEvalManagerKnowledgeAreasId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalKnowledgeArea.IUpdate;
}): Promise<IJobPerformanceEvalKnowledgeArea> {
  const { manager, id, body } = props;

  // Verify the knowledge area exists and is not soft deleted
  const existing =
    await MyGlobal.prisma.job_performance_eval_knowledge_areas.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  if (existing.deleted_at !== null) {
    throw new Error("Knowledge area not found or is deleted");
  }

  // Prepare update data, only including fields provided
  const updateData: {
    code?: string | null;
    name?: string | null;
    description?: string | null;
    deleted_at?: (string & tags.Format<"date-time">) | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (body.code !== undefined) updateData.code = body.code;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.deleted_at !== undefined) updateData.deleted_at = body.deleted_at;

  const updated =
    await MyGlobal.prisma.job_performance_eval_knowledge_areas.update({
      where: { id },
      data: updateData,
    });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
