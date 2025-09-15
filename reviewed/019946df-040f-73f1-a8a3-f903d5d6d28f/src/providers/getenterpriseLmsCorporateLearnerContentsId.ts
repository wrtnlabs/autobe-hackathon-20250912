import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieve details of a specific content item by its ID.
 *
 * This includes the full content metadata such as title, description, content
 * type, approval status, business lifecycle status, tenant ownership, and
 * timestamps.
 *
 * Authorization enforces tenant boundary: only content belonging to the
 * corporateLearner's tenant can be accessed.
 *
 * Soft deleted content (deleted_at != null) is excluded.
 *
 * @param props - Object containing corporateLearner and content id
 * @param props.corporateLearner - The authenticated corporate learner payload
 * @param props.id - UUID of the content item to retrieve
 * @returns Detailed content entity information conforming to
 *   IEnterpriseLmsContents
 * @throws Error if content is not found or unauthorized
 */
export async function getenterpriseLmsCorporateLearnerContentsId(props: {
  corporateLearner: CorporatelearnerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContents> {
  const { corporateLearner, id } = props;

  const content =
    await MyGlobal.prisma.enterprise_lms_contents.findFirstOrThrow({
      where: {
        id,
        tenant_id: corporateLearner.tenant_id,
        deleted_at: null,
      },
    });

  return {
    id: content.id,
    tenant_id: content.tenant_id,
    title: content.title,
    description: content.description ?? null,
    content_type: content.content_type,
    status: content.status,
    business_status: content.business_status,
    created_at: toISOStringSafe(content.created_at),
    updated_at: toISOStringSafe(content.updated_at),
    deleted_at: content.deleted_at ? toISOStringSafe(content.deleted_at) : null,
  };
}
