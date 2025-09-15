import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Delete a knowledge area by ID from the job_performance_eval_knowledge_areas
 * table
 *
 * This operation permanently deletes a knowledge area entity from the Job
 * Performance Evaluation system. It removes the record from the
 * job_performance_eval_knowledge_areas table using the knowledge area ID
 * provided in the path parameter. This hard delete action fully eliminates the
 * knowledge area data and cannot be undone.
 *
 * Only authorized users with the manager role may perform this deletion. The
 * system will confirm successful deletion via HTTP status codes without
 * response body.
 *
 * @param props - Object containing the manager payload and knowledge area ID
 * @param props.manager - The authenticated manager performing the deletion
 * @param props.id - The UUID of the knowledge area to delete
 * @throws {Error} Throws if the knowledge area with the specified ID does not
 *   exist
 */
export async function deletejobPerformanceEvalManagerKnowledgeAreasId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.job_performance_eval_knowledge_areas.delete({
    where: { id: props.id },
  });
}
