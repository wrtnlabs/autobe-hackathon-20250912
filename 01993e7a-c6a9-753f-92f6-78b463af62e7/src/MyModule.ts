import { Module } from "@nestjs/common";

import { AuthRegularuserController } from "./controllers/auth/regularUser/AuthRegularuserController";
import { AuthPremiumuserController } from "./controllers/auth/premiumUser/AuthPremiumuserController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { RecipesharingRegularuserRegularusersController } from "./controllers/recipeSharing/regularUser/regularUsers/RecipesharingRegularuserRegularusersController";
import { RecipesharingPremiumuserRegularusersController } from "./controllers/recipeSharing/premiumUser/regularUsers/RecipesharingPremiumuserRegularusersController";
import { RecipesharingRegularuserPremiumusersController } from "./controllers/recipeSharing/regularUser/premiumUsers/RecipesharingRegularuserPremiumusersController";
import { RecipesharingPremiumuserPremiumusersController } from "./controllers/recipeSharing/premiumUser/premiumUsers/RecipesharingPremiumuserPremiumusersController";
import { RecipesharingModeratorModeratorsController } from "./controllers/recipeSharing/moderator/moderators/RecipesharingModeratorModeratorsController";
import { RecipesharingRegularuserRecipesController } from "./controllers/recipeSharing/regularUser/recipes/RecipesharingRegularuserRecipesController";
import { RecipesharingRegularuserIngredientsController } from "./controllers/recipeSharing/regularUser/ingredients/RecipesharingRegularuserIngredientsController";
import { RecipesharingPremiumuserIngredientsController } from "./controllers/recipeSharing/premiumUser/ingredients/RecipesharingPremiumuserIngredientsController";
import { RecipesharingRegularuserIngredientsSubstitutionsController } from "./controllers/recipeSharing/regularUser/ingredients/substitutions/RecipesharingRegularuserIngredientsSubstitutionsController";
import { RecipesharingPremiumuserIngredientsSubstitutionsController } from "./controllers/recipeSharing/premiumUser/ingredients/substitutions/RecipesharingPremiumuserIngredientsSubstitutionsController";
import { RecipesharingModeratorIngredientsSubstitutionsController } from "./controllers/recipeSharing/moderator/ingredients/substitutions/RecipesharingModeratorIngredientsSubstitutionsController";
import { RecipesharingModeratorNutritionfactsController } from "./controllers/recipeSharing/moderator/nutritionFacts/RecipesharingModeratorNutritionfactsController";
import { RecipesharingNutritionfactsController } from "./controllers/recipeSharing/nutritionFacts/RecipesharingNutritionfactsController";
import { RecipesharingRegularuserNutritionfactsController } from "./controllers/recipeSharing/regularUser/nutritionFacts/RecipesharingRegularuserNutritionfactsController";
import { RecipesharingRecipecategoriesController } from "./controllers/recipeSharing/recipeCategories/RecipesharingRecipecategoriesController";
import { RecipesharingModeratorRecipecategoriesController } from "./controllers/recipeSharing/moderator/recipeCategories/RecipesharingModeratorRecipecategoriesController";
import { RecipesharingRegularuserTagsController } from "./controllers/recipeSharing/regularUser/tags/RecipesharingRegularuserTagsController";
import { RecipesharingPremiumuserTagsController } from "./controllers/recipeSharing/premiumUser/tags/RecipesharingPremiumuserTagsController";
import { RecipesharingRegularuserUsertagsController } from "./controllers/recipeSharing/regularUser/userTags/RecipesharingRegularuserUsertagsController";
import { RecipesharingIngredientsearchtermsController } from "./controllers/recipeSharing/ingredientSearchTerms/RecipesharingIngredientsearchtermsController";
import { RecipesharingRegularuserUserfollowersController } from "./controllers/recipeSharing/regularUser/userFollowers/RecipesharingRegularuserUserfollowersController";
import { RecipesharingPremiumuserUserfollowersController } from "./controllers/recipeSharing/premiumUser/userFollowers/RecipesharingPremiumuserUserfollowersController";
import { RecipesharingRegularuserPersonalizedfeedsController } from "./controllers/recipeSharing/regularUser/personalizedFeeds/RecipesharingRegularuserPersonalizedfeedsController";
import { RecipesharingPremiumuserPersonalizedfeedsController } from "./controllers/recipeSharing/premiumUser/personalizedFeeds/RecipesharingPremiumuserPersonalizedfeedsController";
import { RecipesharingRegularuserRatingsController } from "./controllers/recipeSharing/regularUser/ratings/RecipesharingRegularuserRatingsController";
import { RecipesharingRegularuserReviewsController } from "./controllers/recipeSharing/regularUser/reviews/RecipesharingRegularuserReviewsController";
import { RecipesharingPremiumuserReviewsController } from "./controllers/recipeSharing/premiumUser/reviews/RecipesharingPremiumuserReviewsController";
import { RecipesharingRegularuserReviewsVotesController } from "./controllers/recipeSharing/regularUser/reviews/votes/RecipesharingRegularuserReviewsVotesController";
import { RecipesharingModeratorReviewsFlagsController } from "./controllers/recipeSharing/moderator/reviews/flags/RecipesharingModeratorReviewsFlagsController";
import { RecipesharingRegularuserReviewsFlagsController } from "./controllers/recipeSharing/regularUser/reviews/flags/RecipesharingRegularuserReviewsFlagsController";
import { RecipesharingModeratorModerationLogsController } from "./controllers/recipeSharing/moderator/moderation/logs/RecipesharingModeratorModerationLogsController";
import { RecipesharingRegularuserCollectionsController } from "./controllers/recipeSharing/regularUser/collections/RecipesharingRegularuserCollectionsController";
import { RecipesharingRegularuserMealplansController } from "./controllers/recipeSharing/regularUser/mealPlans/RecipesharingRegularuserMealplansController";
import { RecipesharingPremiumuserMealplansController } from "./controllers/recipeSharing/premiumUser/mealPlans/RecipesharingPremiumuserMealplansController";
import { RecipesharingRegularuserMealplansEntriesController } from "./controllers/recipeSharing/regularUser/mealPlans/entries/RecipesharingRegularuserMealplansEntriesController";
import { RecipesharingPremiumuserMealplansEntriesController } from "./controllers/recipeSharing/premiumUser/mealPlans/entries/RecipesharingPremiumuserMealplansEntriesController";
import { RecipesharingRegularuserRecurringmealplansController } from "./controllers/recipeSharing/regularUser/recurringMealPlans/RecipesharingRegularuserRecurringmealplansController";
import { RecipesharingShoppinglistsController } from "./controllers/recipeSharing/shoppingLists/RecipesharingShoppinglistsController";
import { RecipesharingRegularuserShoppinglistsController } from "./controllers/recipeSharing/regularUser/shoppingLists/RecipesharingRegularuserShoppinglistsController";
import { RecipesharingPremiumuserShoppinglistsController } from "./controllers/recipeSharing/premiumUser/shoppingLists/RecipesharingPremiumuserShoppinglistsController";
import { RecipesharingRegularuserShoppinglistsShoppinglistitemsController } from "./controllers/recipeSharing/regularUser/shoppingLists/shoppingListItems/RecipesharingRegularuserShoppinglistsShoppinglistitemsController";
import { RecipesharingPremiumuserShoppinglistsShoppinglistitemsController } from "./controllers/recipeSharing/premiumUser/shoppingLists/shoppingListItems/RecipesharingPremiumuserShoppinglistsShoppinglistitemsController";
import { RecipesharingGrocerystoresController } from "./controllers/recipeSharing/groceryStores/RecipesharingGrocerystoresController";
import { RecipesharingModeratorGrocerystoresController } from "./controllers/recipeSharing/moderator/groceryStores/RecipesharingModeratorGrocerystoresController";
import { RecipesharingRegularuserStoreingredientpricesController } from "./controllers/recipeSharing/regularUser/storeIngredientPrices/RecipesharingRegularuserStoreingredientpricesController";
import { RecipesharingPremiumuserStoreingredientpricesController } from "./controllers/recipeSharing/premiumUser/storeIngredientPrices/RecipesharingPremiumuserStoreingredientpricesController";
import { RecipesharingModeratorStoreingredientpricesController } from "./controllers/recipeSharing/moderator/storeIngredientPrices/RecipesharingModeratorStoreingredientpricesController";
import { RecipesharingModeratorRecipecategoriesconfigController } from "./controllers/recipeSharing/moderator/recipeCategoriesConfig/RecipesharingModeratorRecipecategoriesconfigController";
import { RecipesharingDietcategoriesController } from "./controllers/recipeSharing/dietCategories/RecipesharingDietcategoriesController";
import { RecipesharingModeratorDietcategoriesController } from "./controllers/recipeSharing/moderator/dietCategories/RecipesharingModeratorDietcategoriesController";
import { RecipesharingDifficultylevelsController } from "./controllers/recipeSharing/difficultyLevels/RecipesharingDifficultylevelsController";
import { RecipesharingModeratorDifficultylevelsController } from "./controllers/recipeSharing/moderator/difficultyLevels/RecipesharingModeratorDifficultylevelsController";
import { RecipesharingUnitsController } from "./controllers/recipeSharing/units/RecipesharingUnitsController";
import { RecipesharingRegularuserUnitsController } from "./controllers/recipeSharing/regularUser/units/RecipesharingRegularuserUnitsController";
import { RecipesharingModeratorUnitsController } from "./controllers/recipeSharing/moderator/units/RecipesharingModeratorUnitsController";
import { RecipesharingSystemconfigController } from "./controllers/recipeSharing/systemConfig/RecipesharingSystemconfigController";
import { RecipesharingModeratorSystemconfigController } from "./controllers/recipeSharing/moderator/systemConfig/RecipesharingModeratorSystemconfigController";
import { RecipesharingModeratorFlagqueuesController } from "./controllers/recipeSharing/moderator/flagQueues/RecipesharingModeratorFlagqueuesController";
import { RecipesharingRegularuserFlagqueuesController } from "./controllers/recipeSharing/regularUser/flagQueues/RecipesharingRegularuserFlagqueuesController";
import { RecipesharingModeratorModeratoractionsController } from "./controllers/recipeSharing/moderator/moderatorActions/RecipesharingModeratorModeratoractionsController";
import { RecipesharingModeratorCategoryapprovalsController } from "./controllers/recipeSharing/moderator/categoryApprovals/RecipesharingModeratorCategoryapprovalsController";
import { RecipesharingRegularuserCategoryapprovalsController } from "./controllers/recipeSharing/regularUser/categoryApprovals/RecipesharingRegularuserCategoryapprovalsController";

@Module({
  controllers: [
    AuthRegularuserController,
    AuthPremiumuserController,
    AuthModeratorController,
    RecipesharingRegularuserRegularusersController,
    RecipesharingPremiumuserRegularusersController,
    RecipesharingRegularuserPremiumusersController,
    RecipesharingPremiumuserPremiumusersController,
    RecipesharingModeratorModeratorsController,
    RecipesharingRegularuserRecipesController,
    RecipesharingRegularuserIngredientsController,
    RecipesharingPremiumuserIngredientsController,
    RecipesharingRegularuserIngredientsSubstitutionsController,
    RecipesharingPremiumuserIngredientsSubstitutionsController,
    RecipesharingModeratorIngredientsSubstitutionsController,
    RecipesharingModeratorNutritionfactsController,
    RecipesharingNutritionfactsController,
    RecipesharingRegularuserNutritionfactsController,
    RecipesharingRecipecategoriesController,
    RecipesharingModeratorRecipecategoriesController,
    RecipesharingRegularuserTagsController,
    RecipesharingPremiumuserTagsController,
    RecipesharingRegularuserUsertagsController,
    RecipesharingIngredientsearchtermsController,
    RecipesharingRegularuserUserfollowersController,
    RecipesharingPremiumuserUserfollowersController,
    RecipesharingRegularuserPersonalizedfeedsController,
    RecipesharingPremiumuserPersonalizedfeedsController,
    RecipesharingRegularuserRatingsController,
    RecipesharingRegularuserReviewsController,
    RecipesharingPremiumuserReviewsController,
    RecipesharingRegularuserReviewsVotesController,
    RecipesharingModeratorReviewsFlagsController,
    RecipesharingRegularuserReviewsFlagsController,
    RecipesharingModeratorModerationLogsController,
    RecipesharingRegularuserCollectionsController,
    RecipesharingRegularuserMealplansController,
    RecipesharingPremiumuserMealplansController,
    RecipesharingRegularuserMealplansEntriesController,
    RecipesharingPremiumuserMealplansEntriesController,
    RecipesharingRegularuserRecurringmealplansController,
    RecipesharingShoppinglistsController,
    RecipesharingRegularuserShoppinglistsController,
    RecipesharingPremiumuserShoppinglistsController,
    RecipesharingRegularuserShoppinglistsShoppinglistitemsController,
    RecipesharingPremiumuserShoppinglistsShoppinglistitemsController,
    RecipesharingGrocerystoresController,
    RecipesharingModeratorGrocerystoresController,
    RecipesharingRegularuserStoreingredientpricesController,
    RecipesharingPremiumuserStoreingredientpricesController,
    RecipesharingModeratorStoreingredientpricesController,
    RecipesharingModeratorRecipecategoriesconfigController,
    RecipesharingDietcategoriesController,
    RecipesharingModeratorDietcategoriesController,
    RecipesharingDifficultylevelsController,
    RecipesharingModeratorDifficultylevelsController,
    RecipesharingUnitsController,
    RecipesharingRegularuserUnitsController,
    RecipesharingModeratorUnitsController,
    RecipesharingSystemconfigController,
    RecipesharingModeratorSystemconfigController,
    RecipesharingModeratorFlagqueuesController,
    RecipesharingRegularuserFlagqueuesController,
    RecipesharingModeratorModeratoractionsController,
    RecipesharingModeratorCategoryapprovalsController,
    RecipesharingRegularuserCategoryapprovalsController,
  ],
})
export class MyModule {}
