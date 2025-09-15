import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Delete a nutrition fact record by its unique ID.
 *
 * This operation permanently removes the nutrition fact from the database. Only
 * regular users are authorized via external decorator or middleware.
 *
 * @param props - The function props including the regular user and nutrition
 *   fact ID
 * @param props.regularUser - The authenticated regular user performing deletion
 * @param props.nutritionFactId - The UUID of the nutrition fact to delete
 * @throws {Error} If the nutrition fact does not exist or deletion fails
 */
export async function deleterecipeSharingRegularUserNutritionFactsNutritionFactId(props: {
  regularUser: RegularuserPayload;
  nutritionFactId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, nutritionFactId } = props;

  // Perform hard delete of the nutrition fact by id
  await MyGlobal.prisma.recipe_sharing_nutrition_facts.delete({
    where: { id: nutritionFactId },
  });
}
