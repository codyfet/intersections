import React, { Component } from 'react';

import Autosuggest from 'react-autosuggest';

import superagentCache from 'superagent-cache';
const superagent = superagentCache();

import './App.css';

let POSTERS_ACTORS_MAP = {};

/**
 *  App component
 */
class App extends Component {

    constructor(props){

        super(props);

        this.state = {
            actors : [],
            movies: []
        };
    }

    handleAddActor(newActor){

        const actors = this.state.actors.slice(0);
        const profile_path = newActor.profile_path===null ? '/img/blank_avatar2.png' : 'http://image.tmdb.org/t/p/w92' + newActor.profile_path;

        actors.push({
            id : newActor.id,
            name : newActor.name,
            profile_path : profile_path
        });

        POSTERS_ACTORS_MAP[newActor.id] = profile_path;

        this.setState({
            actors: actors
        });

        // request the-movie-db service for retrieving all actor's movies
        this.getActorMovies(newActor.id);

    }

    handleRemoveActor(idRemovedActor){
        // actors except removed actor
        const filteredActorsArray = this.state.actors.filter(function( obj ) {
            return obj.id.toString() !== idRemovedActor;
        });

        // movies except movies related only with removed actor
        const filteredMoviesArray = this.state.movies.filter(function( movieNote ) {

            const idMovie = Object.keys(movieNote)[0];
            const actorsArray = movieNote[idMovie].actorsArray;

            let keepMovieInState = false;
            let filteredActorsArray = [];

            actorsArray.forEach(function(idActor){
                if(idActor.toString() !== idRemovedActor) {
                    keepMovieInState = true;
                    filteredActorsArray.push(idActor);
                }
            });

            movieNote[idMovie].actorsArray = filteredActorsArray;

            return keepMovieInState;
        });

        // sort movies array by intersections count
        filteredMoviesArray.sort(function(a, b) {
            var idMovieA = Object.keys(a)[0];
            var idMovieB = Object.keys(b)[0];

            if (a[idMovieA].actorsArray.length < b[idMovieB].actorsArray.length) {
                return 1;
            }
            if (a[idMovieA].actorsArray.length > b[idMovieB].actorsArray.length) {
                return -1;
            }
            return 0;
        });

        this.setState({
            actors : filteredActorsArray,
            movies : filteredMoviesArray
        });
    }

    resetApplication(){
        this.setState({
            movies:[],
            actors:[]
        });
    }

    getActorMovies(idActor){

        var that = this;

        superagent.get('http://api.themoviedb.org/3/person/' + idActor + '/combined_credits?api_key=37662c76ffc19e5cd1b95f37d77155fc')
            .then(function (response) {

                let movies = that.state.movies.slice(0);

                const moviesCast = response.body.cast;
                const actorId = response.body.id;

                for(let i=0; i<moviesCast.length; i++){

                    let movieExists = false;

                    for(let j=0; j<movies.length; j++){

                        const idMovie_ = Object.keys(movies[j])[0];

                        if( idMovie_.toString() === moviesCast[i].id.toString() ) {
                            // update actorsId array and add new actor to it
                            var actorsArray = movies[j][idMovie_].actorsArray;
                            if(actorsArray.indexOf(actorId) === -1){
                                actorsArray.push(actorId);
                            }

                            movieExists = true;
                            break;
                        }
                    }

                    if( !movieExists && moviesCast[i].media_type === 'movie' ) {
                        movies.push({
                            [moviesCast[i].id] : {
                                'poster_path' : (moviesCast[i].poster_path!==null) ? 'http://image.tmdb.org/t/p/w92' + moviesCast[i].poster_path : '/img/reel2.png',
                                'release_date' : moviesCast[i].release_date,
                                'title' : moviesCast[i].title,
                                'actorsArray' : [actorId]
                            }
                        });
                    }

                }

                // sort array by intersections count
                movies.sort(function(a, b) {
                    var idMovieA = Object.keys(a)[0];
                    var idMovieB = Object.keys(b)[0];

                    if (a[idMovieA].actorsArray.length < b[idMovieB].actorsArray.length) {
                        return 1;
                    }
                    if (a[idMovieA].actorsArray.length > b[idMovieB].actorsArray.length) {
                        return -1;
                    }
                    return 0;
                });

                that.setState({
                    movies : movies
                });
            }, function(error){
                console.log(error);
            });

    }

    render() {

        return (
            <div className='appWrapper'>

                <div className='headerLabel'>This simple React application allows you to search different movie actors and determines movies where this actors intersected.</div>

                <Search addActorFunc={ this.handleAddActor.bind(this)} resetAppFunc={this.resetApplication.bind(this) }/>
                <ActorsList actors={ this.state.actors }  removeActorFunc={this.handleRemoveActor.bind(this)} />
                <MoviesList movies={ this.state.movies } />

            </div>
        );
    }
}


/**
 *  Search component
 */

class Search extends Component {

    constructor(props) {
        super(props);

        this.state = {
            value: '',
            suggestions: []
        };

    }

    onChange(event, { newValue }) {
       this.setState({
           value: newValue
       });
    }

    getSuggestionValue(suggestion) {
        return suggestion.name;
    }

    renderSuggestion(suggestion) {
        return <div className={suggestion.id}>{suggestion.name}</div>;
    }

    onSuggestionsFetchRequested(value) {

        if (value.length < 3) {
            return false;
        }

        var that = this;

        superagent
            .get('http://api.themoviedb.org/3/search/person?api_key=37662c76ffc19e5cd1b95f37d77155fc&query=' + value)
            .then(function (response) {
                console.log('Response in autocomplete functionality');
                console.log(response);

                var results = response.body.results;

                that.setState({
                    suggestions: results
                });
            }, function(error){
                console.log(error);
            });

    }

    // Autosuggest will call this function every time you need to clear suggestions. 
    onSuggestionsClearRequested(){
       this.setState({
           suggestions: []
       });
    }

    clearSeacrhInput(){
        this.state = {
            value: ''
        };
    }

    onSuggestionSelected(e) {
        const id = e.target.closest('div.searchWrapper').getElementsByClassName('react-autosuggest__suggestion--focused')[0].children[0].className;

        var actorObject = this.state.suggestions.filter(function( obj ) {
            return obj.id.toString() === id;
        })[0];

        this.props.addActorFunc(actorObject);

        // not works for mouse selecting :(
        this.clearSeacrhInput();
    }

    handleResetClick(e){
        e.preventDefault();

        this.props.resetAppFunc();
    }

    render() {

        const { value, suggestions } = this.state;
        const inputProps = {
            placeholder: 'Enter name and press enter',
            value,
            onChange: this.onChange.bind(this)
        };

        return (
            <div className='searchWrapper'>

                <a className='resetButton' href='#' onClick={ this.handleResetClick.bind(this) }>reset application</a>

                <Autosuggest
                    suggestions={suggestions}
                    onSuggestionsFetchRequested={this.onSuggestionsFetchRequested.bind(this)}
                    onSuggestionsClearRequested={this.onSuggestionsClearRequested.bind(this)}
                    getSuggestionValue={this.getSuggestionValue}
                    renderSuggestion={this.renderSuggestion}
                    inputProps={inputProps}
                    onSuggestionSelected={this.onSuggestionSelected.bind(this)}
                />

            </div>
        );
    }
}

/**
 *  ActorsList component
 */

class ActorsList extends Component {
    constructor(props){
        super(props);

        this.state = {
            actors : props.actors
        };

        this.removeHandler = this.removeHandler.bind(this);
    }

    removeHandler(e){

        const liEl = e.target.closest('li');
        const id = liEl.className.substr(liEl.className.indexOf('_')+1, liEl.className.length);

        this.props.removeActorFunc(id);
    }

    render() {

        const isEmptyList = this.props.actors.length === 0;
        const removeHandlerFunc = this.removeHandler;

        return (
            <div className='actorsListWrapper'>
                <ul>
                    {isEmptyList ? '' : this.props.actors.map(function(item) {
                        return <Actor actor={item} key={guid()} removeHandler={removeHandlerFunc} />;
                    })}
                </ul>
            </div>
        );

    }
}

/**
 *  Actor component
 */

class Actor extends Component {

    render() {

        const id_ = 'id_' + this.props.actor.id;

        return (
            <li className={id_} >
                <img className='actorAvatar' alt='Аватар актера' src={this.props.actor.profile_path}/>
                <div className='actorLabel'>{this.props.actor.name}</div>
                <span className='remove' onClick={this.props.removeHandler}>Remove</span>
            </li>
        );
    }

}

/**
 *  MoviesList component
 */

class MoviesList extends Component {

    render() {

        const isEmptyList = this.props.movies.length === 0;

        return (
            <div className='moviesListWrapper'>
                <ul>
                    {isEmptyList ? '' : this.props.movies.map(function(item) {
                        return <Movie movie={item} key={guid()} />;
                    })}
                </ul>
            </div>
        );
    }

}

/**
 *  Movie component
 */

class Movie extends Component {

    render() {

        const idMovie = Object.keys(this.props.movie)[0];
        const id_ = 'id_' + idMovie;

        return (
            <li className={id_}>
                <img className='movieAvatar' alt='Аватар актера' src={this.props.movie[idMovie].poster_path}/>
                <div className='movieLabel'>{this.props.movie[idMovie].title ? this.props.movie[idMovie].title : 'title missed, sorry'}</div>
                <div className='actorsGallery'>
                    {
                        this.props.movie[idMovie].actorsArray.map(function(item){
                            return <img key={ guid() } className='actorsGalleryItem' alt='Аватар актера' src={POSTERS_ACTORS_MAP[item]} />;
                        })
                    }
                </div>
            </li>
        );
    }
}

/**
 *  Generates unique value (used for keys)
 */

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

export default App;