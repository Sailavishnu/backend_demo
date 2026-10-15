const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

const COLLECTIONS = {
  books: {"title": {"type": "text", "required": true}, "author": {"type": "text", "required": true}, "genre": {"type": "text", "required": true}, "copies": {"type": "number", "required": true}}
};
function parseId(id) { return ObjectId.isValid(id) ? new ObjectId(id) : null; }
function validate(body, partial = false) {
  const cleaned = {};
  const definition = COLLECTIONS.books;
  for (const [key, value] of Object.entries(body || {})) {
    if (!Object.prototype.hasOwnProperty.call(definition, key)) continue;
    if (value === "" || value === null || value === undefined) {
      if (!partial && definition[key].required) return { error: `${key} is required.` };
      continue;
    }
    if (definition[key].type === "number") {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) return { error: `${key} must be a non-negative number.` };
      cleaned[key] = number;
    } else {
      cleaned[key] = String(value).trim();
    }
  }
  if (!partial) {
    for (const [key, rule] of Object.entries(definition)) {
      if (rule.required && (cleaned[key] === undefined || cleaned[key] === "")) return { error: `${key} is required.` };
    }
  }
  if (!Object.keys(cleaned).length) return { error: "Provide at least one valid field." };
  return { data: cleaned };
}

router.get("/books", async (req, res, next) => {
  try {
    const data = await req.db.collection("books").find({}).sort({ _id: -1 }).limit(500).toArray();
    res.json({ data });
  } catch (error) { next(error); }
});
router.post("/books", async (req, res, next) => {
  try {
    const checked = validate(req.body);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const document = { ...checked.data, createdAt: new Date(), updatedAt: new Date() };
    const result = await req.db.collection("books").insertOne(document);
    res.status(201).json({ data: { ...document, _id: result.insertedId } });
  } catch (error) { next(error); }
});
router.put("/books/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid record ID." });
    const checked = validate(req.body, true);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const result = await req.db.collection("books").findOneAndUpdate(
      { _id: id }, { $set: { ...checked.data, updatedAt: new Date() } }, { returnDocument: "after" }
    );
    // MongoDB Node driver v6 returns the document directly by default;
    // older configurations may return a wrapper containing `value`.
    const updatedDocument = result && Object.prototype.hasOwnProperty.call(result, "value")
      ? result.value
      : result;
    if (!updatedDocument) return res.status(404).json({ error: "Record not found." });
    res.json({ data: updatedDocument });
  } catch (error) { next(error); }
});
router.delete("/books/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid record ID." });
    const result = await req.db.collection("books").deleteOne({ _id: id });
    if (!result.deletedCount) return res.status(404).json({ error: "Record not found." });
    res.json({ message: "Deleted successfully." });
  } catch (error) { next(error); }
});
module.exports = router;
