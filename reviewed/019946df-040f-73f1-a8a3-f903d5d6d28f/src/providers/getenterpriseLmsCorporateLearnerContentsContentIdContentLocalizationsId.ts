import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Get detailed info about a specific content localization.
 *
 * This function retrieves a single content localization record by its ID and
 * associated content item ID, verifying the corporate learner's tenant
 * authorization.
 *
 * @param props - Object containing corporateLearner auth payload, contentId,
 *   and localization id.
 * @param props.corporateLearner - Authenticated corporate learner payload
 *   including user ID.
 * @param props.contentId - UUID of the content item to which the localization
 *   belongs.
 * @param props.id - UUID of the specific content localization record.
 * @returns The localized content record with language, localized fields, and
 *   timestamps.
 * @throws {Error} If content, learner, or localization is not found, or
 *   unauthorized access.
 */
export async function getenterpriseLmsCorporateLearnerContentsContentIdContentLocalizationsId(props: {
  corporateLearner: CorporatelearnerPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentLocalization> {
  const { corporateLearner, contentId, id } = props;

  // Fetch content to verify it exists and belongs to learner's tenant
  const content = await MyGlobal.prisma.enterprise_lms_contents.findUnique({
    where: { id: contentId },
    select: { id: true, tenant_id: true },
  });

  if (!content) throw new Error("Content not found");

  // Fetch tenant_id of the corporate learner
  const learner =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUnique({
      where: { id: corporateLearner.id },
      select: { tenant_id: true },
    });

  if (!learner) throw new Error("Corporate learner not found");

  // Check tenant authorization
  if (learner.tenant_id !== content.tenant_id) {
    throw new Error("Unauthorized access to content localization");
  }

  // Fetch the content localization record
  const localization =
    await MyGlobal.prisma.enterprise_lms_content_localizations.findFirst({
      where: { id, content_id: contentId },
    });

  if (!localization) throw new Error("Content localization not found");

  // Return with date conversion and null handling
  return {
    id: localization.id,
    content_id: localization.content_id,
    language_code: localization.language_code,
    localized_title: localization.localized_title ?? null,
    localized_description: localization.localized_description ?? null,
    created_at: toISOStringSafe(localization.created_at),
    updated_at: toISOStringSafe(localization.updated_at),
  };
}
