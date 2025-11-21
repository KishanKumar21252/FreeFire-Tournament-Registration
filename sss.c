#include <stdio.h>

int main() {
    int num_rows = 5;

    for (int i = num_rows; i >= 1; i--) {
        
        for (int j = 1; j <= i; j++) {
            printf("* "); 
        }
        printf("\n");
    }

    return 0;
}