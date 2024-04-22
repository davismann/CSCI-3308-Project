document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('myModal');
    var btn = document.getElementById('myBtn');
    var form = document.getElementById('recipeFiltersForm');

    btn.onclick = function () {
        modal.style.display = 'block';
    }


    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    form.onsubmit = function (event) {
        event.preventDefault();

        //calorie handling
        let cal;
        if (form.minCal.value && form.maxCal.value) {
            cal = form.minCal.value + "-" + form.maxCal.value;
        }
        else if (form.minCal.value && !form.maxCal.value) {
            cal = form.minCal.value + "+"
        }
        else if (!form.minCal.value && form.maxCal.value) {
            cal = form.maxCal.value
        }
        else {
            cal = undefined;
        }

        // Protein Handling
        let protein;
        if (form.minProtein.value && form.maxProtein.value) {
            protein = form.minProtein.value + "-" + form.maxProtein.value;
        } else if (form.minProtein.value && !form.maxProtein.value) {
            protein = form.minProtein.value + "+";
        } else if (!form.minProtein.value && form.maxProtein.value) {
            protein = form.maxProtein.value;
        } else {
            protein = undefined;
        }


        // Fat Handling
        let fat;
        if (form.minFat.value && form.maxFat.value) {
            fat = form.minFat.value + "-" + form.maxFat.value;
        } else if (form.minFat.value && !form.maxFat.value) {
            fat = form.minFat.value + "+";            
        } else if (!form.minFat.value && form.maxFat.value) {
            fat = form.maxFat.value;
        } else {
            fat = undefined;
        }

        // Carbs Handling
        let carbs;
        if (form.minCarbs.value && form.maxCarbs.value) {
            carbs = form.minCarbs.value + "-" + form.maxCarbs.value;
        } else if (form.minCarbs.value && !form.maxCarbs.value) {
            carbs = form.minCarbs.value + "+";
        } else if (!form.minCarbs.value && form.maxCarbs.value) {
            carbs = form.maxCarbs.value;
        } else {
            carbs = undefined;
        }

        //keyword handling
        let keyword;
        if(form.keyword.value){
            keyword = form.keyword.value;
        }
        else{
            keyword = undefined;
        }

        //mealType handling
        let mealType;
        if(form.mealType.value == "None"){
            mealType = undefined;
        }
        else{
            mealType = form.mealType.value;
        }

        var filters = {
            calories: cal,
            q: keyword,
            mealType: mealType,
            nutrients: {
                PROCNT: protein,
                CHOCDF: carbs,
                FAT: fat
            }
        };

        fetch('/recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filters: filters })
        }).then(response => response.json())
            .then(data => {
                console.log(data);
                window.location.reload();
            }).catch(error => {
                console.error('Error:', error);
            });

        modal.style.display = 'none';
    }
});