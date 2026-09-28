const Crop = require("../models/Crop");
const Category = require("../models/Category");
const User = require("../models/User");

// Builds the tool declarations Gemini can choose to call. Category keys are
// injected dynamically so the model always knows the real, current list.
async function buildToolDeclarations() {
  const categories = await Category.find().sort({ order: 1 });
  const categoryKeys = categories.map((c) => c.key);

  return [
    {
      name: "addCrop",
      description:
        "Create a new crop listing for the currently logged-in farmer. Only call this once you have all required details confirmed with the farmer.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the crop, e.g. Tomato, Sugarcane" },
          categoryKey: {
            type: "string",
            enum: categoryKeys,
            description: "Which category this crop belongs to",
          },
          quantity: { type: "number", description: "Quantity available" },
          unit: {
            type: "string",
            enum: ["kg", "quintal", "ton", "gram", "dozen", "piece"],
          },
          price: { type: "number", description: "Price per unit, in rupees" },
          description: { type: "string", description: "Optional extra details about the crop" },
        },
        required: ["name", "categoryKey", "quantity", "unit", "price"],
      },
    },
    {
      name: "listCategories",
      description: "Get the list of available crop categories, to help the farmer choose one.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "startRegistration",
      description:
        "Validate a new farmer's name and phone number, and get a link to the registration page (pre-filled) where they can send an OTP and set a password themselves. Only call this once you have their name and a valid 10-digit phone number.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string", description: "10-digit Indian phone number" },
        },
        required: ["name", "phone"],
      },
    },
  ];
}

// Executes a tool call. `ctx` carries the authenticated user (if any).
async function executeTool(name, args, ctx) {
  switch (name) {
    case "listCategories": {
      const categories = await Category.find().sort({ order: 1 });
      return {
        categories: categories.map((c) => ({ key: c.key, name: c.name.en, icon: c.icon })),
      };
    }

    case "addCrop": {
      if (!ctx.user || ctx.user.role !== "farmer") {
        return { error: "You need to be logged in as a farmer to list a crop." };
      }
      const category = await Category.findOne({ key: args.categoryKey });
      if (!category) return { error: "Unknown category." };

      const crop = await Crop.create({
        farmer: ctx.user._id,
        name: args.name,
        category: category._id,
        quantity: args.quantity,
        unit: args.unit,
        price: args.price,
        description: args.description || "",
      });
      return { success: true, cropId: crop._id, name: crop.name };
    }

    case "startRegistration": {
      const { name, phone } = args;
      if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return { error: "That doesn't look like a valid 10-digit Indian phone number." };
      }
      const existing = await User.findOne({ phone });
      if (existing) {
        return { error: "This phone number is already registered. They should log in instead." };
      }
      return {
        success: true,
        redirectUrl: `/farmer/register?phone=${phone}&name=${encodeURIComponent(name)}`,
        message:
          "Phone number looks good and is available. Send them to the registration page (details pre-filled) to send the OTP and set a password.",
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

module.exports = { buildToolDeclarations, executeTool };
