const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const Blog = require("../models/Blog");
const Review = require("../models/Review");
// const User = require("../models/User");

const blogController = {};

blogController.getBlogs = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const totalBlogs = await Blog.countDocuments({
    ...filter,
    isDeleted: false,
  });
  const totalPages = Math.ceil(totalBlogs / limit);
  const offset = limit * (page - 1);

  const blogs = await Blog.find(filter)
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate("author");

  return sendResponse(
    res,
    200,
    true,
    { blogs, totalPages },
    null,
    "Get Blogs success"
  );
});

blogController.getSingleBlog = catchAsync(async (req, res, next) => {
  let blog = await Blog.findById(req.params.id).populate("author");
  if (!blog) {
    return next(new AppError(404, "Blog not found", "Get Single Blog Error"));
  }
  blog = blog.toJSON();
  blog.reviews = await Review.find({ blog: blog._id }).populate("user");

  return sendResponse(res, 200, true, blog, null, "Get Single Blog success");
});

blogController.createNewBlog = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const { title, content } = req.body;
  let { images } = req.body;

  const blog = await Blog.create({
    title,
    content,
    author,
    images,
  });

  return sendResponse(res, 200, true, blog, null, "Create new blog success");
});

blogController.updateSingleBlog = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const blogId = req.params.id;
  const { title, content, images } = req.body;

  const blog = await Blog.findOneAndUpdate(
    { _id: blogId, author: author },
    { title, content, images },
    { new: true }
  );

  if (!blog) {
    return next(
      new AppError(
        400,
        "Blog not found or User not authorized",
        "Update Blog error"
      )
    );
  }

  return sendResponse(res, 200, true, blog, null, "Update Blog success");
});

blogController.deleteSingleBlog = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const blogId = req.params.id;

  const blog = await Blog.findOneAndUpdate(
    { _id: blogId, author: author },
    { isDeleted: true },
    { new: true }
  );

  if (!blog) {
    return next(
      new AppError(
        400,
        "Blog not found or User not authorized",
        "Delete Blog Error"
      )
    );
  }

  return sendResponse(res, 200, true, blog, null, "Delete Blog success");
});

module.exports = blogController;
