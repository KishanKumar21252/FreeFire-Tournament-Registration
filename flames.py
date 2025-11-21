def calculate_flames(name1, name2):
    """
    Calculates the FLAMES relationship between two names.
    """
    # Normalize names: convert to lowercase and remove spaces
    name1 = name1.replace(" ", "").lower()
    name2 = name2.replace(" ", "").lower()

    # Create lists of characters from each name
    list1 = list(name1)
    list2 = list(name2)

    # Remove common characters
    for char in list1[:]:  # Iterate over a copy to allow modification during iteration
        if char in list2:
            list1.remove(char)
            list2.remove(char)

    # Calculate the remaining character count
    remaining_count = len(list1) + len(list2)

    # FLAMES acronym list
    flames = ["Friends", "Love", "Affection", "Marriage", "Enemy", "Siblings"]

    # Simulate the FLAMES game elimination process
    while len(flames) > 1:
        # Determine the index to remove
        # The -1 accounts for 0-based indexing vs. 1-based counting in FLAMES
        removal_index = (remaining_count % len(flames)) - 1

        if removal_index >= 0:
            # Split the list and re-concatenate to remove the element at removal_index
            flames = flames[removal_index + 1:] + flames[:removal_index]
        else:
            # If removal_index is -1 (meaning remaining_count is a multiple of len(flames)),
            # remove the last element
            flames = flames[:len(flames) - 1]

    return flames[0]

if __name__ == "__main__":
    print("Welcome to the FLAMES Game!")
    player1_name = input("Enter the first name: ")
    player2_name = input("Enter the second name: ")

    relationship = calculate_flames(player1_name, player2_name)
    print(f"According to FLAMES, the relationship between {player1_name} and {player2_name} is: {relationship}")