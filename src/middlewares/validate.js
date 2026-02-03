export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'query' ? req.query : req.body;
      const validated = schema.parse(data);
      if (source === 'query') req.validatedQuery = validated;
      else req.validatedBody = validated;
      next();
    } catch (error) { next(error); }
  };
}
