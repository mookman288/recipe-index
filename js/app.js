//https://gist.github.com/rickycheers/4541395
String.prototype.ucwords = function() {
	return this.toLowerCase().replace(
		/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g,
		(s) => {
			return s.toUpperCase();
		}
	);
};

const expiry = 86400000;
const params = new URLSearchParams(window.location.search);

let search, cache, recipes;

const handleError = (error) => {
	document.getElementById('notices').innerHTML = '';
	document.getElementById('notices').className = 'content';
	document.getElementById('notices').insertAdjacentHTML('beforeend', `
		<div class="notification is-danger">` + error + `</div>
	`);
};

const handleInfo = (info) => {
	document.getElementById('notices').innerHTML = '';
	document.getElementById('notices').className = 'content';
	document.getElementById('notices').insertAdjacentHTML('beforeend', `
		<div class="notification is-primary">` + info + `</div>
	`);
};

const getElementHtml = (recipe, compact, hideButton) => {
	let author = '', description = '', ingredients = '', steps = '', tags = '', extra = '';

	if (typeof recipe.author !== 'undefined') {
		if (typeof recipe.authorLink !== 'undefined') {
			author += '<a href="' + recipe.authorLink + '" target="_blank">' + recipe.author + '</a>';
		} else {
			author = recipe.author;
		}
	}

	if (typeof recipe.description !== 'undefined') {
		recipe.description.split(/\r?\n/).forEach((line) => {
			description = description + '<p>' + line + '</p>'
		});
	}

	if (typeof recipe.ingredients !== 'undefined') {
		ingredients = `
			<div class="panel-block is-block">
				<h3>Ingredients</h3>
				<ul>`;
		recipe.ingredients.forEach((line) => {
			if (typeof line.amount !== 'undefined') {
				line.amount = line.amount.toString()
					.replace('0.', '.')
					.replace('.66', '&frac23;')
					.replace('.67', '&frac23;')
					.replace('.5', '&frac12;')
					.replace('.50', '&frac12;')
					.replace('.33', '&frac13;')
					.replace('.34', '&frac13;')
					.replace('.25', '&frac14;')
					.replace('.125', '&frac18;')
					.replace('.0625', '1&frasl;16')
					.replace('.', '0.');
			}

			ingredients += '<li>'
			+ ((typeof line.amount !== 'undefined') ? line.amount + ' ' : '')
			+ ((typeof line.measurement !== 'undefined') ? line.measurement.ucwords() + ' ' : '')
			+ ((typeof line.ingredient !== 'undefined') ? line.ingredient.ucwords() : '')
			+ ((typeof line.addendum !== 'undefined') ? ', ' + line.addendum.ucwords() : '')
			+ '</li>';
		});
		ingredients += `
				</ul>
			</div>
			`;
	}

	if (typeof recipe.recipe !== 'undefined') {
		steps = `
			<div class="panel-block is-block">
				<h3>Recipe</h3>
				<ol>`;
		recipe.recipe.forEach((line) => {
			if (typeof recipe.ingredients !== 'undefined') {
				for (i = recipe.ingredients.length - 1; i >= 0; i--) {
					if (typeof recipe.ingredients[i] !== 'undefined'
						&& typeof recipe.ingredients[i].ingredient !== 'undefined') {
						line = line.replace('&$' + i, recipe.ingredients[i].ingredient.ucwords());
					}
				}
			}

			steps += '<li>' + line + '</li>';
		});

		steps += `
				</ol>
			</div>
			`;
	}

	if (typeof recipe.tags !== 'undefined') {
		tags = '<div class="panel-block is-block">';

		recipe.tags.forEach((tag) => {
			tags += '<a href="?s=' + encodeURIComponent(tag) + '" class="button is-primary is-light is-small">' + tag
				+ '</a>&nbsp;';
		});

		tags += '</div>';
	}

	if (typeof recipe.servings !== 'undefined' || typeof recipe.calories !== 'undefined') {
		extra = '<div class="panel-block is-block">';

		if (typeof recipe.servings !== 'undefined' && recipe.servings > 1) {
			extra += 'Servings: ' + recipe.servings;

			if (typeof recipe.calories !== 'undefined') {
				extra += ' (' + Math.round(recipe.calories / recipe.servings) + ' calories per serving)';
			}
		} else if (typeof recipe.calories !== 'undefined') {
			extra += 'Calories: ' + recipe.calories;
		}

		extra += '</div>';
	}

	const button = '<a href="?r=' + recipe.slug + '" class="button is-link is-fullwidth">Read Recipe</a>';

	return `
		<div class="column is-full-mobile is-full-tablet` + ((!compact) ? '' : ' is-half-desktop') + `">
			<div class="panel is-info">
				<div class="panel-heading">
					<h2 class="is-subtitle is-marginless has-text-white is-size-4">` + recipe.name.ucwords() + `</h2>
				</div>
				<div class="panel-block">
					` + author + `
				</div>
				<div class="panel-block is-block">
					` + description + `
				</div>
				` + ((!compact) ? `
					` + ingredients + `
					` + steps + `
					` + extra + `
				` : '') + `
					` + tags + `
				` + ((!hideButton) ? `
				<div class="panel-block">
					` + button + `
				</div>
				` : '') + `
			</div>
		</div>
	`;
};

const parseRecipe = (recipe, slug, store, update) => {
	if (store) {
		if (typeof recipe.name !== 'undefined') {
			recipe.slug = slug;

			recipes[slug] = recipe;

			const recipesObject = {
				data: recipes,
				timestamp: new Date()
			};

			localStorage.setItem('recipes', JSON.stringify(recipesObject));
		}
	}

	if (update) updateRecipes();
}

const updateRecipes = () => {
	document.getElementById('content').innerHTML = '';

	for (slug in recipes) {
		document.getElementById('content').insertAdjacentHTML('beforeend', getElementHtml(recipes[slug], true));
	}

	processSearch();
}

const processSearch = () => {
	if (search) return;

	search = true;
	let currentRecipe = params.get('r');
	let searchTerm = params.get('s');

	if (currentRecipe || searchTerm) document.querySelector('.branding').innerHTML = '&larr; Back';

	if (currentRecipe && typeof recipes !== 'undefined') {
		if (recipes[currentRecipe] !== 'undefined') {
			document.querySelector('title').innerHTML = recipes[currentRecipe].name.ucwords() + ' - '
				+ document.querySelector('title').innerHTML;
			document.querySelector('.meta-description').setAttribute('content', recipes[currentRecipe].description);
			document.getElementById('content').innerHTML = getElementHtml(recipes[currentRecipe], false, true);
		} else {
			handleError('No recipe was found referencing that slug.');
		}
	} else if (searchTerm) {
		let results = {};

		document.getElementById('s').value = searchTerm;

		document.querySelector('h1').innerHTML = 'Searching for: ' + searchTerm;

		document.getElementById('content').innerHTML = '';

		searchTerm.split(' ').forEach((term) => {
			for (const slug in recipes) {
				const regex = new RegExp(term, 'g');

				if (typeof recipes[slug].name !== 'undefined') {
					if (recipes[slug].name.match(regex)) {
						if (typeof results[slug] === 'undefined') {
							results[slug] = recipes[slug];
						}
					}
				}

				if (typeof recipes[slug].description !== 'undefined') {
					if (recipes[slug].description.match(regex)) {
						if (typeof results[slug] === 'undefined') {
							results[slug] = recipes[slug];
						}
					}
				}

				if (typeof recipes[slug].tags !== 'undefined') {
					recipes[slug].tags.forEach((tag) => {
						if (tag.match(regex)) {
							if (typeof results[slug] === 'undefined') {
								results[slug] = recipes[slug];
							}
						}
					});
				}
			}
		});

		if (Object.keys(results).length > 0) {
			handleInfo("Number of results: " + Object.keys(results).length);

			recipes = results;

			updateRecipes();
		} else {
			handleError('No recipes were found using those search terms.')
		}
	}
}

const getRecipes = () => {
	if (typeof recipes === 'undefined' || Object.keys(recipes).length < 1
		|| Math.abs(new Date() - new Date(cache.timestamp) > expiry)) {

		fetch('recipes.json')
			.then((response) => {
				if (response.status !== 200) {
					handleError('There was an error connecting to the recipe index.');
				}

				return response.json();
			})
			.then((data) => {
				data.forEach((file, key, collection) => {
					fetch('recipes/' + file + '.json')
						.then((response) => {
							if (response.status !== 200) {
								handleError('There was an error retrieving recipe: ' + file + '.');
							}

							return response.json();
						})
						.then((recipe) => {
							parseRecipe(
								recipe,
								file,
								true,
								Object.is(data.length - 1, key)
							);
						})
						.catch((error) => {
							console.error(error);

							handleError('There was an error processing the recipe file.');
						});
				})
			})
			.catch((error) => {
				console.error(error);

				handleError('There was an error processing the recipe index.');
			});
	} else {
		for (const slug in recipes) {
			parseRecipe(
				recipes[slug],
				slug,
				false,
				Object.is(Object.keys(recipes)[Object.keys(recipes).length - 1], slug)
			);
		}
	}
};

const app = (() => {
	//Clear the cache to fetch new recipes.
	if (params.get('c')) {
		localStorage.removeItem('recipes');

		handleInfo('Cache cleared: fetching new recipes.');
	}

	search = false;
	cache = JSON.parse(localStorage.getItem('recipes')) ?? {};
	recipes = (typeof cache.data !== 'undefined') ? cache.data : {};

	document.querySelector('html').setAttribute('lang', 'en');

	getRecipes();
})();