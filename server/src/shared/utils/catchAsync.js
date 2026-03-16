/**
 * Wrap async route handler để không phải try/catch trong mỗi controller.
 * Dùng: router.get('/path', catchAsync(controller.method))
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
