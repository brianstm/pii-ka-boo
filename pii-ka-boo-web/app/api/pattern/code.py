import re
import json
import sys


def replace_custom_pattern(
        original_string: str,
        replace_by: str,
        pattern_sequence: list[dict] = None
) -> str:
    """
    Replaces parts of a string based on user-friendly criteria.
    It can either use simple 'starts_with'/'ends_with' logic or build a complex
    pattern from a 'pattern_sequence'. This function abstracts away direct regex.

    Args:
        original_string (str): The text in which to perform the replacement.
        starts_with (str, optional): The literal text the pattern should begin with.
                                     Ignored if 'pattern_sequence' is provided.
        ends_with (str, optional): The literal text the pattern should end with.
                                   Ignored if 'pattern_sequence' is provided.
        n_char (int, optional): Exact number of characters between 'starts_with' and 'ends_with'.
                                Only effective when both are provided. Ignored if 'pattern_sequence'.
        replace_by (str): The string to insert in place of the matched pattern.
                          Defaults to an empty string.
        pattern_sequence (list[dict], optional): A list of dictionaries, where each dict
                                                 describes a component of the pattern.
                                                 If provided, it takes precedence over
                                                 'starts_with', 'ends_with', and 'n_char'.
                                                 Each dictionary must have a 'type' key.
                                                 - 'type': 'literal', 'letters', 'uppercase_letters',
                                                           'lowercase_letters', 'digits', 'any_char',
                                                           'whitespace', 'non_whitespace', 'word_char',
                                                           'non_word_char'.
                                                 - 'value' (required for 'literal' type): The literal string to match.
                                                 - 'quantity' (optional): int (exact count), 'one_or_more',
                                                                          'zero_or_more', 'optional'.

    Returns:
        str: The string after performing the replacements.

    Raises:
        ValueError: If no valid pattern can be formed from the provided inputs,
                    if 'n_char' is invalid, or if 'pattern_sequence' is malformed.
    """
    final_regex_pattern = ""

    # --- Build pattern from pattern_sequence ---
    regex_parts = []
    for i, component in enumerate(pattern_sequence):
        comp_type = component.get('type')
        comp_value = component.get('value')
        comp_quantity = component.get('quantity', 1)  # Default quantity is 1
        
        print(f"DEBUG: Processing component {i}: type={comp_type}, value={comp_value}, quantity={comp_quantity} (type: {type(comp_quantity)})", file=sys.stderr)

        regex_segment = ""
        if comp_type == 'literal':
            if comp_value is None:
                raise ValueError(
                    "Pattern component of type 'literal' requires a 'value'.")
            regex_segment = re.escape(comp_value)
        elif comp_type == 'letters':
            regex_segment = '[a-zA-Z]'
        elif comp_type == 'uppercase_letters':
            regex_segment = '[A-Z]'
        elif comp_type == 'lowercase_letters':
            regex_segment = '[a-z]'
        elif comp_type == 'digits':
            regex_segment = '\\d'
        elif comp_type == 'any_char':
            regex_segment = '.'
        elif comp_type == 'whitespace':
            regex_segment = '\\s'
        elif comp_type == 'non_whitespace':
            regex_segment = '\\S'
        elif comp_type == 'word_char':
            regex_segment = '\\w'
        elif comp_type == 'non_word_char':
            regex_segment = '\\W'
        else:
            raise ValueError(f"Unknown pattern component type: '{comp_type}'")

        # Apply quantity
        if isinstance(comp_quantity, int):
            if comp_quantity < 0:
                raise ValueError(
                    f"Quantity for '{comp_type}' must be non-negative, got {comp_quantity}.")
            regex_segment += f"{{{comp_quantity}}}"
        # NEW: Handle (min, max) tuple
        elif isinstance(comp_quantity, tuple) and len(comp_quantity) == 2:
            min_c, max_c = comp_quantity
            if not (isinstance(min_c, int) and isinstance(max_c, int) and min_c >= 0 and max_c >= min_c):
                raise ValueError(
                    f"Quantity tuple for '{comp_type}' must be (min_int, max_int) with min >= 0 and max >= min. Got {comp_quantity}.")
            regex_segment += f"{{{min_c},{max_c}}}"
        elif comp_quantity == 'one_or_more':
            regex_segment += '+'
        elif comp_quantity == 'zero_or_more':
            regex_segment += '*'
        elif comp_quantity == 'optional':
            regex_segment += '?'
        elif comp_quantity == 1:  # Default, no quantifier needed if it's just one
            pass
        elif isinstance(comp_quantity, int) and comp_quantity > 1:
            # Handle exact count greater than 1
            regex_segment += f"{{{comp_quantity}}}"
        else:
            raise ValueError(
                f"Unknown quantity type: '{comp_quantity}' for type '{comp_type}'.")

        regex_parts.append(regex_segment)

    final_regex_pattern = "".join(regex_parts)
    
    print(f"DEBUG: Final regex pattern: {final_regex_pattern}", file=sys.stderr)

    if not final_regex_pattern:
        raise ValueError(
            "No pattern created: An unexpected condition resulted in an empty pattern. Please review your inputs.")

    # --- Perform Replacement ---
    try:
        result = re.sub(final_regex_pattern, replace_by, original_string)
        return result
    except re.error as e:
        raise ValueError(
            f"An internal error occurred with the generated pattern: '{final_regex_pattern}'. Error: {e}")


def get_component_type() -> str:
    """Prompts the user to select a component type."""
    type_options = {
        '1': 'literal',
        '2': 'letters',
        '3': 'uppercase_letters',
        '4': 'lowercase_letters',
        '5': 'digits',
        '6': 'any_char',
        '7': 'whitespace',
        '8': 'non_whitespace',
        '9': 'word_char',
        '10': 'non_word_char',
    }
    while True:
        print("\n--- Choose Component Type ---")
        for key, desc in type_options.items():
            print(f"{key}. {desc.replace('_', ' ').title()}")
        choice = input("Enter your choice (number): ").strip()
        if choice in type_options:
            return type_options[choice]
        print("Invalid choice. Please enter a number from the list.")


def get_component_value(comp_type: str) -> str | None:
    """Prompts for a literal value if the type is 'literal'."""
    if comp_type == 'literal':
        while True:
            value = input(
                "Enter the exact text to match for this literal: ").strip()
            if value:
                return value
            print("Literal type requires a value. Please enter some text.")
    return None


def get_component_quantity() -> int | str | tuple[int, int]:
    """Prompts the user to select a quantity for the component."""
    quantity_options = {
        '1': 'exactly N times',
        '2': 'one_or_more (+)',
        '3': 'zero_or_more (*)',
        '4': 'optional (?)',
        '5': 'range (min, max)',
    }
    while True:
        print("\n--- Choose Quantity ---")
        for key, desc in quantity_options.items():
            print(f"{key}. {desc}")
        choice = input("Enter your choice (number, or leave blank for default 'exactly 1 time'): ").strip(
        ) or '0'  # Default to 1

        if choice == '1':  # Exactly N times
            while True:
                n_str = input(
                    "Enter the exact number of times (e.g., 3): ").strip()
                if n_str.isdigit() and int(n_str) >= 0:
                    return int(n_str)
                print("Invalid input. Please enter a non-negative whole number.")
        elif choice == '2':
            return 'one_or_more'
        elif choice == '3':
            return 'zero_or_more'
        elif choice == '4':
            return 'optional'
        elif choice == '5':  # Range (min, max)
            while True:
                min_str = input("Enter minimum number of times: ").strip()
                max_str = input("Enter maximum number of times: ").strip()
                if min_str.isdigit() and max_str.isdigit():
                    min_val = int(min_str)
                    max_val = int(max_str)
                    if min_val >= 0 and max_val >= min_val:
                        return (min_val, max_val)
                print(
                    "Invalid input. Min and max must be non-negative whole numbers, and max >= min.")
        elif choice == '0':  # Default, means exactly 1
            return 1
        print("Invalid choice. Please enter a number from the list.")

# --- Main Interactive Pattern Builder ---


def interactive_pattern_builder():
    print("🌟 Welcome to the Interactive Pattern Builder! 🌟")
    print("You'll define your blurring pattern component by component.")

    custom_pattern_sequence = []
    component_count = 0

    while True:
        component_count += 1
        print(f"\n--- Defining Component {component_count} ---")

        comp_type = get_component_type()
        comp_value = get_component_value(comp_type)
        comp_quantity = get_component_quantity()

        component = {'type': comp_type}
        if comp_value is not None:
            component['value'] = comp_value
        if comp_quantity != 1:  # Only add quantity if it's not the default of 1
            component['quantity'] = comp_quantity

        custom_pattern_sequence.append(component)
        print(f"\nAdded component: {component}")

        add_another = input(
            "Add another component? (yes/no): ").strip().lower()
        if add_another != 'yes':
            break

    print("\n--- Custom Pattern Sequence Finished ---")
    print(f"Your generated pattern sequence: {custom_pattern_sequence}")

    return custom_pattern_sequence


# --- API Mode Processing ---
def process_api_request():
    """Process JSON input from API and return processed text."""
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.readline().strip())
        
        text = input_data.get('text', '')
        pattern_sequence = input_data.get('pattern_sequence', [])
        replace_by = input_data.get('replace_by', '[BLURRED]')
        
        # Debug logging
        print(f"DEBUG: Received text: {text}", file=sys.stderr)
        print(f"DEBUG: Received pattern_sequence: {pattern_sequence}", file=sys.stderr)
        print(f"DEBUG: Received replace_by: {replace_by}", file=sys.stderr)
        
        if not text or not pattern_sequence:
            print(json.dumps({
                'error': 'Missing required fields: text and pattern_sequence'
            }))
            return
        
        # Process the text using the pattern
        processed_text = replace_custom_pattern(
            original_string=text,
            pattern_sequence=pattern_sequence,
            replace_by=replace_by
        )
        
        # Output the processed text
        print(processed_text)
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            'error': f'Invalid JSON input: {str(e)}'
        }))
    except ValueError as e:
        print(json.dumps({
            'error': f'Pattern processing error: {str(e)}'
        }))
    except Exception as e:
        print(json.dumps({
            'error': f'Unexpected error: {str(e)}'
        }))


# --- Main Execution Block ---
if __name__ == "__main__":
    # Check if running in API mode (has stdin input)
    if not sys.stdin.isatty():
        process_api_request()
    else:
        # Interactive mode
        generated_pattern = interactive_pattern_builder()

        if generated_pattern:
            print("\nNow, let's test your custom pattern with the blurring tool!")
            test_doc = input("Enter a document to test your pattern on: ").strip()
            replace_with = input(
                "Replace matched pattern with (e.g., '[BLURRED]'): ").strip()

            try:
                blurred_doc = replace_custom_pattern(
                    original_string=test_doc,
                    pattern_sequence=generated_pattern,
                    replace_by=replace_with
                )
                print(f"\nOriginal Document: '{test_doc}'")
                print(f"Blurred Document:  '{blurred_doc}'")
            except ValueError as e:
                print(f"Error applying blurring: {e}")
        else:
            print("No pattern was created.")
