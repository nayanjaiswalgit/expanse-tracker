"""
Runtime API contract validation for BUDGETON
"""

from rest_framework import serializers
from rest_framework.response import Response
from rest_framework import status
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class APIContractValidator:
    """Runtime validation for API contracts"""

    @staticmethod
    def validate_transaction_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate transaction data against expected schema"""
        errors = []

        # Required fields
        required_fields = ['description', 'amount', 'transaction_type']
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")

        # Validate transaction_type enum
        valid_types = [
            'income', 'expense', 'transfer', 'buy', 'sell',
            'dividend', 'lend', 'borrow', 'repayment'
        ]
        if 'transaction_type' in data and data['transaction_type'] not in valid_types:
            errors.append(f"Invalid transaction_type. Must be one of: {', '.join(valid_types)}")

        # Validate amount
        if 'amount' in data:
            try:
                float(data['amount'])
            except (ValueError, TypeError):
                errors.append("Amount must be a valid number")

        # Validate date format if present
        if 'date' in data:
            import datetime
            try:
                datetime.datetime.strptime(str(data['date']), '%Y-%m-%d')
            except ValueError:
                errors.append("Date must be in YYYY-MM-DD format")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'data': data
        }

    @staticmethod
    def validate_account_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate account data against expected schema"""
        errors = []

        # Required fields
        required_fields = ['name', 'account_type']
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")

        # Validate account_type enum
        valid_types = ['checking', 'savings', 'credit', 'investment', 'loan', 'cash', 'other']
        if 'account_type' in data and data['account_type'] not in valid_types:
            errors.append(f"Invalid account_type. Must be one of: {', '.join(valid_types)}")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'data': data
        }

    @staticmethod
    def validate_user_preferences(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate user preferences data"""
        errors = []

        # Valid fields for user preferences
        valid_fields = ['default_currency', 'timezone', 'language', 'full_name']
        invalid_fields = [field for field in data.keys() if field not in valid_fields]

        if invalid_fields:
            errors.append(f"Invalid fields: {', '.join(invalid_fields)}")

        # Validate currency code format
        if 'default_currency' in data:
            currency = data['default_currency']
            if not isinstance(currency, str) or len(currency) != 3:
                errors.append("Currency must be a 3-letter ISO code (e.g., USD)")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'data': data
        }


class ContractValidationMixin:
    """Mixin to add contract validation to ViewSets"""

    def validate_request_data(self, data: Dict[str, Any], validator_method: str) -> Optional[Response]:
        """Validate request data and return error response if invalid"""
        validator = getattr(APIContractValidator, validator_method)
        validation_result = validator(data)

        if not validation_result['valid']:
            logger.warning(f"API contract validation failed: {validation_result['errors']}")
            return Response({
                'detail': 'Request data validation failed',
                'errors': validation_result['errors'],
                'received_data': data
            }, status=status.HTTP_400_BAD_REQUEST)

        return None


class ResponseValidator:
    """Validate API responses against expected formats"""

    @staticmethod
    def validate_pagination_response(response_data: Dict[str, Any]) -> bool:
        """Validate paginated response format"""
        required_fields = ['results']
        return all(field in response_data for field in required_fields)

    @staticmethod
    def validate_list_response(response_data: Any) -> bool:
        """Validate list response format"""
        return isinstance(response_data, (list, dict))

    @staticmethod
    def validate_error_response(response_data: Dict[str, Any]) -> bool:
        """Validate error response format"""
        return 'detail' in response_data or 'errors' in response_data


def validate_api_response(response_data: Any, expected_type: str = 'list') -> Dict[str, Any]:
    """
    Validate API response format

    Args:
        response_data: The response data to validate
        expected_type: Expected response type ('list', 'pagination', 'error')

    Returns:
        Dict with validation results
    """
    validator = ResponseValidator()

    if expected_type == 'pagination':
        is_valid = validator.validate_pagination_response(response_data)
    elif expected_type == 'error':
        is_valid = validator.validate_error_response(response_data)
    else:  # list or single object
        is_valid = validator.validate_list_response(response_data)

    return {
        'valid': is_valid,
        'response_data': response_data,
        'expected_type': expected_type
    }


# Decorators for automatic validation
def validate_transaction_request(view_func):
    """Decorator to validate transaction requests"""
    def wrapper(self, request, *args, **kwargs):
        if request.method in ['POST', 'PUT', 'PATCH']:
            validation_error = self.validate_request_data(
                request.data,
                'validate_transaction_data'
            )
            if validation_error:
                return validation_error
        return view_func(self, request, *args, **kwargs)
    return wrapper


def validate_account_request(view_func):
    """Decorator to validate account requests"""
    def wrapper(self, request, *args, **kwargs):
        if request.method in ['POST', 'PUT', 'PATCH']:
            validation_error = self.validate_request_data(
                request.data,
                'validate_account_data'
            )
            if validation_error:
                return validation_error
        return view_func(self, request, *args, **kwargs)
    return wrapper