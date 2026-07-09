const Joi = require('joi');

const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: true, // Allow metadata/other fields not explicitly schema-defined
      stripUnknown: true // Remove parameters that are not in the schema
    });

    if (error) {
      const details = error.details.map(d => d.message).join(', ');
      return res.status(400).json({
        success: false,
        message: `Validation Error: ${details}`,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    // Reassign request property to the sanitized value
    req[property] = value;
    next();
  };
};

module.exports = { validateRequest };
