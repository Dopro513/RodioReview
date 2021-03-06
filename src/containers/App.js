import React, { Component } from 'react';
import { HashRouter as Router, Redirect } from 'react-router-dom';
import Route from 'react-router-dom/Route';

import fireDB from '../fireDB';
import gcp_config from '../GCP_configs';

import Text from '../components/Text';
import Top from '../components/Top';
import Heading from '../components/Heading';
import Message from '../components/Message';
import Survey from './Survey';
import NewForm from './NewForm';
import Login from './Login';

import '../css/Hidden.css';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      post: 0,
      text: [],
      placesList: [],
      previosIndexList: [],
      previosIndex: undefined,
      previosDatascore_id: undefined,
      user: {},
      newItem: false,
      dbIsFull: false,
    }; // <- set up react state
  }

  setNew = (bool) => {
    this.setState({ newItem: bool });
  }

  // ---> 1. FIREBASE DB <---
  authListener() {
    fireDB.auth().onAuthStateChanged((user) => {
      if (user) {
        this.setState({ user });
        localStorage.setItem('user', user.uid);
      }
      else {
        this.setState({ user: null });
        localStorage.removeItem('user');
      }
    });
  }

  showPrev = (e) => {
    e.preventDefault();
    this.hideEl('negative', true);
    let temporaryList = this.state.previosIndexList;
    if (temporaryList.length > 0) {
      let previosElement = temporaryList.pop();
      this.setState({ post: previosElement, previosIndexList: temporaryList, previosDatascore_id: this.state.text[previosElement].datastore_id });
    }
  }

  showNext = (post, e) => {
    e.preventDefault();
    let temporaryList = this.state.previosIndexList;
    let number = this.findNextUnsubmitedElement(post);
    if (number !== undefined) {
      temporaryList.push(post);
      this.setState({ post: number, previosIndexList: temporaryList });
    }
  }

  toUndef = (post, e) => {
    e.preventDefault();
    let temporaryList = this.state.previosIndexList;
    temporaryList.push(post);
    this.setState({ post: undefined, previosIndexList: temporaryList });
  }

  findNextUnsubmitedElement = (post) => {
    const { text } = this.state;
    for (let i = post + 1, size = Object.values(text).length; i < size; i++) {
      if ((text[i].assigned_user === this.state.user.email)
        && text[i].submission_time === null) {
        return i;
      }
    }
  }

  //CSS methods
  showEl = (el, time, bool) => {
    const current = document.getElementById(el);
    this.hideEl('negative', false);
    this.hideEl('error', false);
    if (current.style.display === 'none') {
      current.style.display = 'block';
      current.scrollIntoView(true);
      setTimeout(this.hideEl, time, el, bool);
    }
  }
  hideEl = (el, bool) => {
    try {
      document.getElementById(el).style.display = 'none';
      if (bool)
        document.getElementById('top').scrollIntoView(true);
    } catch (err) {
    }
  }

  // ---> 3. GCP <---
  componentDidMount() {
    this.authListener(); // <--- FIREBASE DB
    let headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(gcp_config.username + ":" + gcp_config.password));
    fetch('https://roadio-master.appspot.com/v1/get_places?limit=-1')
      .then(response => response.json())
      .then(placeData => this.setState({ placesList: placeData }, () => {
        fetch('https://roadio-master.appspot.com/v1/get_user_items?user_id=management_user&limit=-1', { method: 'GET', headers: headers, })
          .then(response => response.json())
          .then(data => this.setState({ text: data.items }, () => {
            this.setState({ dbIsFull: true });
          }));
      }));

  }

  render() {
    
    if (this.state.user) {
      const { post, text, previosIndexList, user, newItem } = this.state;
      let submitted = false;
      let hideMessage, hideDiv;
      let number = this.findNextUnsubmitedElement(post);
      if (post !== 0) {
        number = post;
      }

      let isNextElementExist = this.findNextUnsubmitedElement(number) !== undefined;
      const itemId = text[number] === undefined ? false : text[number].datastore_id;
      if (text.length === 0)  //Loading
        return (
          <Top user={user.email} itemId={false} >
            <Message color='teal' icon='circle notched loading icon'
              text1='רק שניה' text2='מביאים לכם את התוכן' />
          </Top>
        )
      else if (this.state.newItem) {
        return (
          <Top user={user.email} itemId={false} >
            <Heading heading={'New item'} />
            <NewForm
              user={user.email}
              post={{ place: null, lat: undefined, lon: undefined }}
              placesList={this.state.placesList}
              setNew={this.setNew}
            />
          </Top>

        )
      } else if (post === undefined || (post === 0 && number === undefined)) { //All text submitted
        submitted = true;
        hideMessage = false;
        hideDiv = true;
      } else { //Main
        hideMessage = true;
        hideDiv = false;
      }

      return (
        <Router >
          <div>
            <Route path={"/:name"} exact render={(routeProps) => {
              let string = "/" + routeProps.match.params.name;
              let postExistanse = false;
              if (number === undefined && Object.values(text).length > 0 && this.state.previosIndexList.length === 0 || routeProps.history.action == "POP") {
                for (let i = 0, size = Object.values(text).length; i < size; i++) {
                  if (text[i].datastore_id == routeProps.match.params.name) {
                    submitted = false;
                    hideMessage = true;
                    hideDiv = false;
                    postExistanse = true;
                    number = i;
                    break;
                  }
                }
              }
              if (itemId) {
                if (!(this.state.previosIndexList.length > 0 && this.findNextUnsubmitedElement(this.state.previosIndexList[this.state.previosIndexList.length - 1] ) === number ) && this.state.previosDatascore_id != text[number].datastore_id ) {
                  for (let i = 0, size = Object.values(text).length; i < size; i++) {
                    if (text[i].datastore_id == routeProps.match.params.name) {
                      submitted = false;
                      postExistanse = true;
                      number = i;
                      break;
                    }
                  }
                }

                string = "/" + text[number].datastore_id;

              }
              isNextElementExist = this.findNextUnsubmitedElement(number) !== undefined;
              return (
                <Top user={user.email} itemId={itemId} setNew={() => this.setNew(true)} >
                  <Redirect to={string} />
                  <Message className={hideMessage ? 'hidden' : ''} color='green' icon='check icon'
                    text1='מצטערים' text2='כל הפוסטים כבר נבדקו' />
                  <div className={hideDiv ? 'hidden' : ''}>
                    <Text text={hideDiv ? '' : text[number].raw_text} heading={hideDiv ? '' : text[number].place} />
                  </div>

                  <Survey postNum={number}
                    showPrev={this.showPrev} showNext={this.showNext} showEl={this.showEl}
                    numberOfPreviousElemnts={previosIndexList.length}
                    nextElementExistanse={isNextElementExist}
                    toUndef={this.toUndef}
                    post={submitted ? '' : text[number]}
                    user={submitted ? '' : user.email}
                    submitted={submitted}
                    placesList={this.state.placesList}
                  />
                </Top>
              );
            }} />
            <Route path={"/"} exact render={() => {
              let string = "/" + (text[number] === undefined ? "" : text[number].datastore_id);

              return (
                <Top user={user.email} itemId={itemId} setNew={() => this.setNew(true)} >
                  <Redirect to={string} />
                  <Message className={hideMessage ? 'hidden' : ''} color='green' icon='check icon'
                    text1='מצטערים' text2='כל הפוסטים כבר נבדקו' />
                  <div className={hideDiv ? 'hidden' : ''}>
                    <Text text={hideDiv ? '' : text[number].raw_text} heading={hideDiv ? '' : text[number].place} />
                  </div>

                  <Survey postNum={number}
                    showPrev={this.showPrev} showNext={this.showNext} showEl={this.showEl}
                    numberOfPreviousElemnts={previosIndexList.length}
                    nextElementExistanse={isNextElementExist}
                    toUndef={this.toUndef}
                    post={submitted ? '' : text[number]}
                    user={submitted ? '' : user.email}
                    submitted={submitted}
                    placesList={this.state.placesList}
                  />
                </Top>
              );
            }} />
          </div>
        </Router>
      )
    }
    else {
      return (
        <Login showEl={this.showEl} hideEl={this.hideEl} />
      )
    }
  }
}

export default App;
