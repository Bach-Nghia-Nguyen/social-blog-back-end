const mongoose = require("mongoose");

const templateSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    template_key: { type: String, required: true, unique: true },
    from: { type: String, required: true },
    html: { type: String, required: true },
    subject: { type: String, required: true },
    variables: [{ type: String, required: true }],
  },
  { timestamps: true }
);

const Template = mongoose.model("Template", templateSchema);
module.exports = Template;
